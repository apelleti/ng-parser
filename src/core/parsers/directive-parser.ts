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
} from '../../types/index.js';
import { EntityType, RelationType } from '../../types/index.js';
import {
  getSourceLocation,
  getDocumentation,
  getModifiers,
  getDecorators,
  generateEntityId,
  getClassName,
  isSignalFunction,
  parseExpression,
} from '../../utils/ast-helpers.js';
import { getPrimaryTypeName } from '../../utils/type-helpers.js';
import { extractPropertyInjectCalls, extractConstructorInjectCalls } from '../../utils/inject-helpers.js';

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

    const decorators = getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo);
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
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    const entity: DirectiveEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Directive, context.rootDir),
      type: EntityType.Directive,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo),
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

      const decorators = getDecorators(member, context.sourceFile, context.rootDir, context.gitInfo);
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

      const decorators = getDecorators(member, context.sourceFile, context.rootDir, context.gitInfo);
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
        if (typeof provider === 'string') {
          const importPath = this.findImportPathForType(provider, context.sourceFile);
          const relationship: Relationship = {
            id: `${entity.id}:provides:${provider}`,
            type: RelationType.Provides,
            source: entity.id,
            target: provider,
            metadata: {
              importPath,
            },
          };
          context.addRelationship(relationship);
        }
      });
    }

    // Extract constructor parameter dependencies
    // Find the constructor with a body (implementation, not overload signature)
    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m) && (m as ts.ConstructorDeclaration).body
    ) as ts.ConstructorDeclaration;

    if (constructor && constructor.parameters) {
      constructor.parameters.forEach((param) => {
        if (param.type) {
          const rawTypeName = param.type.getText(context.sourceFile);
          // Normalize type name (strip array brackets, extract from generics)
          const typeName = getPrimaryTypeName(rawTypeName) || rawTypeName;
          const importPath = this.findImportPathForType(typeName, context.sourceFile);
          const relationship: Relationship = {
            id: `${entity.id}:injects:${typeName}`,
            type: RelationType.Injects,
            source: entity.id,
            target: typeName,
            metadata: {
              importPath,
              originalType: rawTypeName !== typeName ? rawTypeName : undefined,
            },
          };
          context.addRelationship(relationship);
        }
      });
    }

    // Extract inject() function calls in properties
    const propertyInjects = extractPropertyInjectCalls(node, context.sourceFile);
    propertyInjects.forEach((injectCall) => {
      const typeName = getPrimaryTypeName(injectCall.token) || injectCall.token;
      const importPath = this.findImportPathForType(typeName, context.sourceFile);
      const relationship: Relationship = {
        id: `${entity.id}:injects:${typeName}:${injectCall.propertyName || 'prop'}`,
        type: RelationType.Injects,
        source: entity.id,
        target: typeName,
        metadata: {
          importPath,
          optional: injectCall.optional,
          self: injectCall.self,
          skipSelf: injectCall.skipSelf,
          host: injectCall.host,
          injectionMethod: 'inject-function',
          propertyName: injectCall.propertyName,
        },
      };
      context.addRelationship(relationship);
    });

    // Extract inject() calls in constructor body
    if (constructor) {
      const constructorInjects = extractConstructorInjectCalls(constructor, context.sourceFile);
      constructorInjects.forEach((injectCall) => {
        const typeName = getPrimaryTypeName(injectCall.token) || injectCall.token;
        const importPath = this.findImportPathForType(typeName, context.sourceFile);
        const relationship: Relationship = {
          id: `${entity.id}:injects:${typeName}:ctor-body`,
          type: RelationType.Injects,
          source: entity.id,
          target: typeName,
          metadata: {
            importPath,
            optional: injectCall.optional,
            self: injectCall.self,
            skipSelf: injectCall.skipSelf,
            host: injectCall.host,
            injectionMethod: 'inject-function',
          },
        };
        context.addRelationship(relationship);
      });
    }
  }

  /**
   * Find the import path for a given type name
   * Searches through import declarations in the source file
   */
  private findImportPathForType(typeName: string, sourceFile: ts.SourceFile): string | undefined {
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;

          // Check named imports
          const namedBindings = statement.importClause?.namedBindings;
          if (namedBindings && ts.isNamedImports(namedBindings)) {
            for (const element of namedBindings.elements) {
              if (element.name.text === typeName) {
                return importPath;
              }
            }
          }

          // Check default import
          const defaultImport = statement.importClause?.name;
          if (defaultImport && defaultImport.text === typeName) {
            return importPath;
          }
        }
      }
    }
    return undefined;
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
