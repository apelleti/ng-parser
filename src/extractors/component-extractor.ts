/**
 * Component extractor
 */

import * as ts from 'typescript';
import type {
  Visitor,
  VisitorContext,
  ComponentEntity,
  InputMetadata,
  OutputMetadata,
  SignalMetadata,
  Relationship,
} from '../types';
import { EntityType, RelationType } from '../types';
import {
  getSourceLocation,
  getDocumentation,
  getModifiers,
  getDecorators,
  generateEntityId,
  getClassName,
  extractLifecycleHooks,
  isSignalFunction,
  parseExpression,
} from '../utils/ast-helpers';

/**
 * Extractor for Angular components
 */
export class ComponentExtractor implements Visitor {
  name = 'ComponentExtractor';
  priority = 100;

  private results: ComponentEntity[] = [];

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const componentDecorator = decorators.find((d) => d.name === 'Component');
    if (!componentDecorator) return;

    await this.extractComponent(node, componentDecorator, context);
  }

  private async extractComponent(
    node: ts.ClassDeclaration,
    decorator: any,
    context: VisitorContext
  ): Promise<void> {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile);

    const entity: ComponentEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Component),
      type: EntityType.Component,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
      modifiers: getModifiers(node),
      selector: args.selector,
      template: args.template,
      templateUrl: args.templateUrl,
      styles: args.styles,
      styleUrls: args.styleUrls,
      standalone: args.standalone ?? false,
      imports: args.imports,
      exports: args.exports,
      providers: args.providers,
      viewProviders: args.viewProviders,
      changeDetection: args.changeDetection,
      encapsulation: args.encapsulation,
      inputs: this.extractInputs(node, context),
      outputs: this.extractOutputs(node, context),
      lifecycle: extractLifecycleHooks(node),
      signals: this.extractSignals(node, context),
    };

    context.addEntity(entity);
    this.results.push(entity);

    // Extract relationships
    this.extractRelationships(entity, node, context);
  }

  private extractInputs(node: ts.ClassDeclaration, context: VisitorContext): InputMetadata[] {
    const inputs: InputMetadata[] = [];

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member)) return;

      const decorators = getDecorators(member, context.sourceFile);
      const inputDecorator = decorators?.find((d) => d.name === 'Input');

      if (inputDecorator) {
        const name = member.name.getText(context.sourceFile);
        inputs.push({
          name,
          propertyName: name,
          type: member.type?.getText(context.sourceFile),
          required: inputDecorator.arguments.required ?? false,
          isSignal: false,
          alias: inputDecorator.arguments.alias,
        });
      }

      // Check for signal-based input()
      if (member.initializer && ts.isCallExpression(member.initializer)) {
        const { isSignal, signalType } = isSignalFunction(member.initializer, context.sourceFile);
        if (isSignal && signalType === 'input') {
          const name = member.name.getText(context.sourceFile);
          inputs.push({
            name,
            propertyName: name,
            type: member.type?.getText(context.sourceFile),
            isSignal: true,
          });
        }
      }
    });

    return inputs;
  }

  private extractOutputs(node: ts.ClassDeclaration, context: VisitorContext): OutputMetadata[] {
    const outputs: OutputMetadata[] = [];

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member)) return;

      const decorators = getDecorators(member, context.sourceFile);
      const outputDecorator = decorators?.find((d) => d.name === 'Output');

      if (outputDecorator) {
        const name = member.name.getText(context.sourceFile);
        outputs.push({
          name,
          propertyName: name,
          type: member.type?.getText(context.sourceFile),
          isSignal: false,
          alias: outputDecorator.arguments.alias,
        });
      }

      // Check for signal-based output()
      if (member.initializer && ts.isCallExpression(member.initializer)) {
        const { isSignal, signalType } = isSignalFunction(member.initializer, context.sourceFile);
        if (isSignal && signalType === 'output') {
          const name = member.name.getText(context.sourceFile);
          outputs.push({
            name,
            propertyName: name,
            type: member.type?.getText(context.sourceFile),
            isSignal: true,
          });
        }
      }
    });

    return outputs;
  }

  private extractSignals(node: ts.ClassDeclaration, context: VisitorContext): SignalMetadata[] {
    const signals: SignalMetadata[] = [];

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member)) return;
      if (!member.initializer || !ts.isCallExpression(member.initializer)) return;

      const { isSignal, signalType } = isSignalFunction(member.initializer, context.sourceFile);

      if (isSignal && signalType) {
        const name = member.name.getText(context.sourceFile);
        signals.push({
          name,
          signalType: signalType as any,
          type: member.type?.getText(context.sourceFile),
          initialValue:
            member.initializer.arguments.length > 0
              ? parseExpression(member.initializer.arguments[0], context.sourceFile)
              : undefined,
        });
      }
    });

    return signals;
  }

  private extractRelationships(
    entity: ComponentEntity,
    node: ts.ClassDeclaration,
    context: VisitorContext
  ): void {
    // Extract imports relationships (for standalone components)
    if (entity.imports) {
      entity.imports.forEach((imp) => {
        const relationship: Relationship = {
          id: `${entity.id}:imports:${imp}`,
          type: RelationType.Imports,
          source: entity.id,
          target: imp,
          metadata: { standalone: true },
        };
        context.addRelationship(relationship);
      });
    }

    // Extract provider relationships
    if (entity.providers) {
      entity.providers.forEach((provider) => {
        const relationship: Relationship = {
          id: `${entity.id}:provides:${provider}`,
          type: RelationType.Provides,
          source: entity.id,
          target: provider,
        };
        context.addRelationship(relationship);
      });
    }

    // Extract constructor dependencies
    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m)
    ) as ts.ConstructorDeclaration;

    if (constructor && constructor.parameters) {
      constructor.parameters.forEach((param) => {
        if (param.type) {
          const typeName = param.type.getText(context.sourceFile);
          const relationship: Relationship = {
            id: `${entity.id}:injects:${typeName}`,
            type: RelationType.Injects,
            source: entity.id,
            target: typeName,
          };
          context.addRelationship(relationship);
        }
      });
    }
  }

  getResults(): ComponentEntity[] {
    return this.results;
  }
}
