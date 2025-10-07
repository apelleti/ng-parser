/**
 * NgModule extractor
 */

import * as ts from 'typescript';
import type {
  ModuleEntity,
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
import { parseProviders } from '../../utils/provider-helpers.js';

/**
 * Extractor for Angular modules
 */
export class ModuleParser {
  private results: ModuleEntity[] = [];

  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo);
    if (!decorators) return;

    const moduleDecorator = decorators.find((d) => d.name === 'NgModule');
    if (!moduleDecorator) return;

    this.extractModule(node, moduleDecorator, context);
  }

  private extractModule(
    node: ts.ClassDeclaration,
    decorator: any,
    context: OldVisitorContext
  ): void {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    const entity: ModuleEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Module, context.rootDir),
      type: EntityType.Module,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile, context.rootDir, context.gitInfo),
      modifiers: getModifiers(node),
      declarations: Array.isArray(args.declarations) ? args.declarations : undefined,
      imports: Array.isArray(args.imports) ? args.imports : undefined,
      exports: Array.isArray(args.exports) ? args.exports : undefined,
      providers: Array.isArray(args.providers) ? args.providers : undefined,
      bootstrap: Array.isArray(args.bootstrap) ? args.bootstrap : undefined,
    };

    context.addEntity(entity);
    this.results.push(entity);

    // Extract relationships
    this.extractRelationships(entity, context);
  }

  private extractRelationships(entity: ModuleEntity, context: OldVisitorContext): void {
    // Extract declaration relationships
    entity.declarations?.forEach((declaration) => {
      if (typeof declaration === 'string') {
        const importPath = this.findImportPathForType(declaration, context.sourceFile);
        const relationship: Relationship = {
          id: `${entity.id}:declares:${declaration}`,
          type: RelationType.Declares,
          source: entity.id,
          target: declaration,
          metadata: {
            importPath,
          },
        };
        context.addRelationship(relationship);
      }
    });

    // Extract import relationships
    entity.imports?.forEach((imp) => {
      if (typeof imp === 'string') {
        const importPath = this.findImportPathForType(imp, context.sourceFile);
        const relationship: Relationship = {
          id: `${entity.id}:imports:${imp}`,
          type: RelationType.Imports,
          source: entity.id,
          target: imp,
          metadata: {
            importPath,
          },
        };
        context.addRelationship(relationship);
      }
    });

    // Extract export relationships
    entity.exports?.forEach((exp) => {
      if (typeof exp === 'string') {
        const importPath = this.findImportPathForType(exp, context.sourceFile);
        const relationship: Relationship = {
          id: `${entity.id}:exports:${exp}`,
          type: RelationType.Exports,
          source: entity.id,
          target: exp,
          metadata: {
            importPath,
          },
        };
        context.addRelationship(relationship);
      }
    });

    // Extract provider relationships (enhanced for complex providers)
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

      // Create relationship to implementation (useClass, useFactory, useExisting)
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

  getResults(): ModuleEntity[] {
    return this.results;
  }

  reset(): void {
    this.results = [];
  }
}
