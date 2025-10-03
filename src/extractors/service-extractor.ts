/**
 * Service/Injectable extractor
 */

import * as ts from 'typescript';
import type {
  Visitor,
  VisitorContext,
  ServiceEntity,
  DependencyMetadata,
  Relationship,
} from '../types/index.js';
import { EntityType, RelationType } from '../types/index.js';
import {
  getSourceLocation,
  getDocumentation,
  getModifiers,
  getDecorators,
  generateEntityId,
  getClassName,
} from '../utils/ast-helpers.js';

/**
 * Extractor for Angular services and injectables
 */
export class ServiceExtractor implements Visitor {
  name = 'ServiceExtractor';
  priority = 90;

  private results: ServiceEntity[] = [];

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const injectableDecorator = decorators.find((d) => d.name === 'Injectable');
    if (!injectableDecorator) return;

    await this.extractService(node, injectableDecorator, context);
  }

  private async extractService(
    node: ts.ClassDeclaration,
    decorator: any,
    context: VisitorContext
  ): Promise<void> {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile);

    const entity: ServiceEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Service),
      type: EntityType.Service,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
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
    context: VisitorContext
  ): DependencyMetadata[] {
    const dependencies: DependencyMetadata[] = [];

    const constructor = node.members.find(
      (m) => ts.isConstructorDeclaration(m)
    ) as ts.ConstructorDeclaration;

    if (!constructor || !constructor.parameters) return dependencies;

    constructor.parameters.forEach((param) => {
      if (!param.type) return;

      const typeName = param.type.getText(context.sourceFile);
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
    context: VisitorContext
  ): void {
    // Extract injection relationships
    entity.dependencies?.forEach((dep) => {
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
        },
      };
      context.addRelationship(relationship);
    });
  }

  getResults(): ServiceEntity[] {
    return this.results;
  }
}
