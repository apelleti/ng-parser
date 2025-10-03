/**
 * NgModule extractor
 */

import * as ts from 'typescript';
import type {
  Visitor,
  VisitorContext,
  ModuleEntity,
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
} from '../utils/ast-helpers';

/**
 * Extractor for Angular modules
 */
export class ModuleExtractor implements Visitor {
  name = 'ModuleExtractor';
  priority = 95;

  private results: ModuleEntity[] = [];

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const moduleDecorator = decorators.find((d) => d.name === 'NgModule');
    if (!moduleDecorator) return;

    await this.extractModule(node, moduleDecorator, context);
  }

  private async extractModule(
    node: ts.ClassDeclaration,
    decorator: any,
    context: VisitorContext
  ): Promise<void> {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile);

    const entity: ModuleEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Module),
      type: EntityType.Module,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
      modifiers: getModifiers(node),
      declarations: args.declarations,
      imports: args.imports,
      exports: args.exports,
      providers: args.providers,
      bootstrap: args.bootstrap,
    };

    context.addEntity(entity);
    this.results.push(entity);

    // Extract relationships
    this.extractRelationships(entity, context);
  }

  private extractRelationships(entity: ModuleEntity, context: VisitorContext): void {
    // Extract declaration relationships
    entity.declarations?.forEach((declaration) => {
      const relationship: Relationship = {
        id: `${entity.id}:declares:${declaration}`,
        type: RelationType.Declares,
        source: entity.id,
        target: declaration,
      };
      context.addRelationship(relationship);
    });

    // Extract import relationships
    entity.imports?.forEach((imp) => {
      const relationship: Relationship = {
        id: `${entity.id}:imports:${imp}`,
        type: RelationType.Imports,
        source: entity.id,
        target: imp,
      };
      context.addRelationship(relationship);
    });

    // Extract export relationships
    entity.exports?.forEach((exp) => {
      const relationship: Relationship = {
        id: `${entity.id}:exports:${exp}`,
        type: RelationType.Exports,
        source: entity.id,
        target: exp,
      };
      context.addRelationship(relationship);
    });

    // Extract provider relationships
    entity.providers?.forEach((provider) => {
      const relationship: Relationship = {
        id: `${entity.id}:provides:${provider}`,
        type: RelationType.Provides,
        source: entity.id,
        target: provider,
      };
      context.addRelationship(relationship);
    });
  }

  getResults(): ModuleEntity[] {
    return this.results;
  }
}
