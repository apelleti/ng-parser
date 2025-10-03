/**
 * Component parser - Core Angular parser (non-extensible)
 */

import * as ts from 'typescript';
import type {
  ComponentEntity,
  InputMetadata,
  OutputMetadata,
  SignalMetadata,
  Relationship,
  VisitorContext as OldVisitorContext,
} from '../../types';
import { EntityType, RelationType } from '../../types';
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
} from '../../utils/ast-helpers';

/**
 * Core parser for Angular @Component decorators
 *
 * This is a built-in parser that cannot be modified by users.
 * For custom analysis, use CustomVisitor instead.
 */
export class ComponentParser {
  private results: ComponentEntity[] = [];

  /**
   * Parse a TypeScript node for @Component decorator
   */
  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const componentDecorator = decorators.find((d) => d.name === 'Component');
    if (!componentDecorator) return;

    this.extractComponent(node, componentDecorator, context);
  }

  private extractComponent(
    node: ts.ClassDeclaration,
    decorator: any,
    context: OldVisitorContext
  ): void {
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
      styles: Array.isArray(args.styles) ? args.styles : undefined,
      styleUrls: Array.isArray(args.styleUrls) ? args.styleUrls : undefined,
      standalone: args.standalone ?? false,
      imports: Array.isArray(args.imports) ? args.imports : undefined,
      exports: Array.isArray(args.exports) ? args.exports : undefined,
      providers: Array.isArray(args.providers) ? args.providers : undefined,
      viewProviders: Array.isArray(args.viewProviders) ? args.viewProviders : undefined,
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

  private extractInputs(node: ts.ClassDeclaration, context: OldVisitorContext): InputMetadata[] {
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

  private extractOutputs(node: ts.ClassDeclaration, context: OldVisitorContext): OutputMetadata[] {
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

  private extractSignals(node: ts.ClassDeclaration, context: OldVisitorContext): SignalMetadata[] {
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
    context: OldVisitorContext
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

  /**
   * Get all parsed components
   */
  getResults(): ComponentEntity[] {
    return this.results;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.results = [];
  }
}
