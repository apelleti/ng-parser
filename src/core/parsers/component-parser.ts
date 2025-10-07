/**
 * Component parser - Core Angular parser (non-extensible)
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type {
  ComponentEntity,
  InputMetadata,
  OutputMetadata,
  SignalMetadata,
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
  extractLifecycleHooks,
  isSignalFunction,
  parseExpression,
} from '../../utils/ast-helpers.js';
import { getPrimaryTypeName } from '../../utils/type-helpers.js';
import { extractPropertyInjectCalls, extractConstructorInjectCalls } from '../../utils/inject-helpers.js';
import { parseProviders } from '../../utils/provider-helpers.js';

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

    const decorators = getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo);
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
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    // Extract animations references
    const animations = this.extractAnimations(args, context);

    const entity: ComponentEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Component, context.rootDir),
      type: EntityType.Component,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo),
      modifiers: getModifiers(node),
      selector: args.selector,
      template: args.template,
      templateUrl: args.templateUrl,
      styles: Array.isArray(args.styles) ? args.styles : undefined,
      styleUrls: this.extractStyleUrls(args, context),
      standalone: args.standalone ?? false,
      imports: Array.isArray(args.imports) ? args.imports : undefined,
      exports: Array.isArray(args.exports) ? args.exports : undefined,
      providers: Array.isArray(args.providers) ? args.providers : undefined,
      viewProviders: Array.isArray(args.viewProviders) ? args.viewProviders : undefined,
      animations,
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

      const decorators = getDecorators(member, context.sourceFile, context.rootDir, context.gitInfo);
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
        if (typeof imp === 'string') {
          const importPath = this.findImportPathForType(imp, context.sourceFile);
          const relationship: Relationship = {
            id: `${entity.id}:imports:${imp}`,
            type: RelationType.Imports,
            source: entity.id,
            target: imp,
            metadata: {
              standalone: true,
              importPath,
            },
          };
          context.addRelationship(relationship);
        }
      });
    }

    // Extract provider relationships (enhanced for complex providers)
    if (entity.providers) {
      const providers = parseProviders(entity.providers, context.sourceFile);
      providers.forEach((provider) => {
        // Create relationship to token
        const tokenImportPath = this.findImportPathForType(provider.token, context.sourceFile);
        context.addRelationship({
          id: `${entity.id}:provides:${provider.token}`,
          type: RelationType.Provides,
          source: entity.id,
          target: provider.token,
          metadata: {
            importPath: tokenImportPath,
            providerType: 'token',
          },
        });

        // Create relationship to implementation
        if (provider.implementation && provider.implementation !== provider.token) {
          const implImportPath = this.findImportPathForType(provider.implementation, context.sourceFile);
          context.addRelationship({
            id: `${entity.id}:provides:${provider.implementation}`,
            type: RelationType.Provides,
            source: entity.id,
            target: provider.implementation,
            metadata: {
              importPath: implImportPath,
              providerType: 'implementation',
            },
          });
        }

        // Create relationship to value reference
        if (provider.value) {
          const valueImportPath = this.findImportPathForType(provider.value, context.sourceFile);
          context.addRelationship({
            id: `${entity.id}:uses:${provider.value}`,
            type: RelationType.Uses,
            source: entity.id,
            target: provider.value,
            metadata: {
              importPath: valueImportPath,
              providerType: 'value',
            },
          });
        }
      });
    }

    // Extract viewProviders relationships (enhanced for complex providers)
    if (entity.viewProviders) {
      const viewProviders = parseProviders(entity.viewProviders, context.sourceFile);
      viewProviders.forEach((provider) => {
        // Create relationship to token
        const tokenImportPath = this.findImportPathForType(provider.token, context.sourceFile);
        context.addRelationship({
          id: `${entity.id}:viewProvides:${provider.token}`,
          type: RelationType.Provides,
          source: entity.id,
          target: provider.token,
          metadata: {
            importPath: tokenImportPath,
            providerType: 'viewProvider-token',
          },
        });

        // Create relationship to implementation
        if (provider.implementation && provider.implementation !== provider.token) {
          const implImportPath = this.findImportPathForType(provider.implementation, context.sourceFile);
          context.addRelationship({
            id: `${entity.id}:viewProvides:${provider.implementation}`,
            type: RelationType.Provides,
            source: entity.id,
            target: provider.implementation,
            metadata: {
              importPath: implImportPath,
              providerType: 'viewProvider-implementation',
            },
          });
        }

        // Create relationship to value reference
        if (provider.value) {
          const valueImportPath = this.findImportPathForType(provider.value, context.sourceFile);
          context.addRelationship({
            id: `${entity.id}:uses:${provider.value}`,
            type: RelationType.Uses,
            source: entity.id,
            target: provider.value,
            metadata: {
              importPath: valueImportPath,
              providerType: 'viewProvider-value',
            },
          });
        }
      });
    }

    // Extract animation references
    if (entity.animations) {
      entity.animations.forEach((animation) => {
        const importPath = this.findImportPathForType(animation, context.sourceFile);
        context.addRelationship({
          id: `${entity.id}:uses:${animation}`,
          type: RelationType.Uses,
          source: entity.id,
          target: animation,
          metadata: {
            importPath,
            usage: 'animation',
          },
        });
      });
    }

    // Extract constructor parameter dependencies
    // Find the constructor with a body (implementation, not overload signature)
    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m) && m.body
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

  /**
   * Extract animation references from component metadata
   */
  private extractAnimations(args: Record<string, any>, context: OldVisitorContext): string[] | undefined {
    if (!args.animations) return undefined;

    // animations can be an array of animation triggers or references
    if (Array.isArray(args.animations)) {
      const animationRefs: string[] = [];

      for (const anim of args.animations) {
        // If it's a string reference (like MATERIAL_ANIMATIONS)
        if (typeof anim === 'string') {
          animationRefs.push(anim);
        }
      }

      return animationRefs.length > 0 ? animationRefs : undefined;
    }

    return undefined;
  }

  /**
   * Extract styleUrls from component decorator arguments
   * Supports both styleUrls (array) and styleUrl (string) - Angular 15.1+
   * Normalizes .css → .scss if the .scss file exists
   */
  private extractStyleUrls(args: Record<string, any>, context: OldVisitorContext): string[] | undefined {
    const styleUrls: string[] = [];

    // Support styleUrls (array)
    if (Array.isArray(args.styleUrls)) {
      styleUrls.push(...args.styleUrls);
    }

    // Support styleUrl (string) - Angular 15.1+
    if (typeof args.styleUrl === 'string') {
      styleUrls.push(args.styleUrl);
    }

    // Normalize .css → .scss if .scss exists (Angular Material pattern)
    const normalizedUrls = styleUrls.map(url => {
      if (url.endsWith('.css')) {
        const componentDir = path.dirname(context.sourceFile.fileName);
        const cssPath = path.resolve(componentDir, url);
        const scssPath = cssPath.replace(/\.css$/, '.scss');

        if (!fs.existsSync(cssPath) && fs.existsSync(scssPath)) {
          return url.replace(/\.css$/, '.scss');
        }
      }
      return url;
    });

    return normalizedUrls.length > 0 ? normalizedUrls : undefined;
  }
}
