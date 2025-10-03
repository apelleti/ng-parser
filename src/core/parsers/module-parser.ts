/**
 * NgModule extractor
 */

import * as ts from 'typescript';
import type {
  ModuleEntity,
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
} from '../../utils/ast-helpers';

/**
 * Extractor for Angular modules
 */
export class ModuleParser {
  private results: ModuleEntity[] = [];

  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
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
    const location = getSourceLocation(node, context.sourceFile);

    const entity: ModuleEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Module, context.rootDir),
      type: EntityType.Module,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
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
        const relationship: Relationship = {
          id: `${entity.id}:declares:${declaration}`,
          type: RelationType.Declares,
          source: entity.id,
          target: declaration,
        };
        context.addRelationship(relationship);
      }
    });

    // Extract import relationships
    entity.imports?.forEach((imp) => {
      if (typeof imp === 'string') {
        const relationship: Relationship = {
          id: `${entity.id}:imports:${imp}`,
          type: RelationType.Imports,
          source: entity.id,
          target: imp,
        };
        context.addRelationship(relationship);
      }
    });

    // Extract export relationships
    entity.exports?.forEach((exp) => {
      if (typeof exp === 'string') {
        const relationship: Relationship = {
          id: `${entity.id}:exports:${exp}`,
          type: RelationType.Exports,
          source: entity.id,
          target: exp,
        };
        context.addRelationship(relationship);
      }
    });

    // Extract provider relationships
    entity.providers?.forEach((provider) => {
      if (typeof provider === 'string') {
        const relationship: Relationship = {
          id: `${entity.id}:provides:${provider}`,
          type: RelationType.Provides,
          source: entity.id,
          target: provider,
        };
        context.addRelationship(relationship);
      }
    });
  }

  getResults(): ModuleEntity[] {
    return this.results;
  }

  reset(): void {
    this.results = [];
  }
}
