/**
 * Service/Injectable extractor
 */

import * as ts from 'typescript';
import type {
  ServiceEntity,
  DependencyMetadata,
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
} from '../../utils/ast-helpers.js';
import { getPrimaryTypeName } from '../../utils/type-helpers.js';
import { extractPropertyInjectCalls, extractConstructorInjectCalls } from '../../utils/inject-helpers.js';

/**
 * Extractor for Angular services and injectables
 */
export class ServiceParser {
  private results: ServiceEntity[] = [];

  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo);
    if (!decorators) return;

    const injectableDecorator = decorators.find((d) => d.name === 'Injectable');
    if (!injectableDecorator) return;

    this.extractService(node, injectableDecorator, context);
  }

  private extractService(
    node: ts.ClassDeclaration,
    decorator: any,
    context: OldVisitorContext
  ): void {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    const entity: ServiceEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Service, context.rootDir),
      type: EntityType.Service,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo),
      modifiers: getModifiers(node),
      providedIn: args.providedIn,
      dependencies: this.extractDependencies(node, context),
    };

    context.addEntity(entity);
    this.results.push(entity);

    // Extract relationships
    this.extractRelationships(entity, node, context);
  }

  private extractDependencies(
    node: ts.ClassDeclaration,
    context: OldVisitorContext
  ): DependencyMetadata[] {
    const dependencies: DependencyMetadata[] = [];

    // Find the constructor with a body (implementation, not overload signature)
    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m) && (m as ts.ConstructorDeclaration).body
    ) as ts.ConstructorDeclaration;

    if (!constructor || !constructor.parameters) return dependencies;

    constructor.parameters.forEach((param) => {
      if (!param.type) return;

      const rawTypeName = param.type.getText(context.sourceFile);
      // Normalize type name (strip array brackets, extract from generics)
      const typeName = getPrimaryTypeName(rawTypeName) || rawTypeName;
      const paramName = param.name.getText(context.sourceFile);
      const decorators = getDecorators(param, context.sourceFile);

      const dependency: DependencyMetadata = {
        name: paramName,
        type: typeName,
        optional: decorators?.some((d) => d.name === 'Optional'),
        self: decorators?.some((d) => d.name === 'Self'),
        skipSelf: decorators?.some((d) => d.name === 'SkipSelf'),
        host: decorators?.some((d) => d.name === 'Host'),
      };

      dependencies.push(dependency);
    });

    return dependencies;
  }

  private extractRelationships(
    entity: ServiceEntity,
    node: ts.ClassDeclaration,
    context: OldVisitorContext
  ): void {
    // Extract constructor parameter injection relationships
    entity.dependencies?.forEach((dep) => {
      const importPath = this.findImportPathForType(dep.type, context.sourceFile);
      const relationship: Relationship = {
        id: `${entity.id}:injects:${dep.type}`,
        type: RelationType.Injects,
        source: entity.id,
        target: dep.type,
        metadata: {
          optional: dep.optional,
          self: dep.self,
          skipSelf: dep.skipSelf,
          host: dep.host,
          importPath,
        },
      };
      context.addRelationship(relationship);
    });

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
    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m) && (m as ts.ConstructorDeclaration).body
    ) as ts.ConstructorDeclaration;

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

  getResults(): ServiceEntity[] {
    return this.results;
  }

  reset(): void {
    this.results = [];
  }
}
