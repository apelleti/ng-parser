/**
 * Directive parser - Core Angular parser (non-extensible)
 */

import * as ts from 'typescript';
import type {
  DirectiveEntity,
  InputMetadata,
  OutputMetadata,
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
  isSignalFunction,
  parseExpression,
} from '../../utils/ast-helpers';

/**
 * Core parser for Angular @Directive decorators
 */
export class DirectiveParser {
  private results: DirectiveEntity[] = [];

  /**
   * Parse a TypeScript node for @Directive decorator
   */
  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const directiveDecorator = decorators.find((d) => d.name === 'Directive');
    if (!directiveDecorator) return;

    this.extractDirective(node, directiveDecorator, context);
  }

  private extractDirective(
    node: ts.ClassDeclaration,
    decorator: any,
    context: OldVisitorContext
  ): void {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile);

    const entity: DirectiveEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Directive),
      type: EntityType.Directive,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
      modifiers: getModifiers(node),
      selector: args.selector,
      standalone: args.standalone ?? false,
      inputs: this.extractInputs(node, context),
      outputs: this.extractOutputs(node, context),
      providers: Array.isArray(args.providers) ? args.providers : undefined,
    };

    context.addEntity(entity);
    this.results.push(entity);

    // Extract relationships
    this.extractRelationships(entity, node, context);
  }

  private extractInputs(node: ts.ClassDeclaration, context: OldVisitorContext): InputMetadata[] {
    const inputs: InputMetadata[] = [];

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member) && !ts.isSetAccessor(member)) return;

      const decorators = getDecorators(member, context.sourceFile);
      const inputDecorator = decorators?.find((d) => d.name === 'Input');

      if (inputDecorator) {
        const name = member.name.getText(context.sourceFile);
        inputs.push({
          name,
          propertyName: name,
          type: ts.isPropertyDeclaration(member)
            ? member.type?.getText(context.sourceFile)
            : undefined,
          required: inputDecorator.arguments.required ?? false,
          isSignal: false,
          alias: inputDecorator.arguments.alias,
        });
      }

      // Check for signal-based input()
      if (
        ts.isPropertyDeclaration(member) &&
        member.initializer &&
        ts.isCallExpression(member.initializer)
      ) {
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

  private extractRelationships(
    entity: DirectiveEntity,
    node: ts.ClassDeclaration,
    context: OldVisitorContext
  ): void {
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
   * Get all parsed directives
   */
  getResults(): DirectiveEntity[] {
    return this.results;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.results = [];
  }
}
