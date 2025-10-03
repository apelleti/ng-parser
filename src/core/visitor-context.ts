/**
 * Visitor context implementation
 */

import * as ts from 'typescript';
import type { Entity, Relationship, VisitorContext } from '../types/index.js';

/**
 * Implementation of VisitorContext
 */
export class VisitorContextImpl implements VisitorContext {
  public entities: Map<string, Entity>;
  public relationships: Relationship[];
  public rootDir?: string;

  constructor(
    public sourceFile: ts.SourceFile,
    public typeChecker: ts.TypeChecker,
    public program: ts.Program,
    rootDir?: string
  ) {
    this.entities = new Map();
    this.relationships = [];
    this.rootDir = rootDir;
  }

  /**
   * Add an entity to the context
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  /**
   * Add a relationship to the context
   */
  addRelationship(relationship: Relationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type: string): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type);
  }

  /**
   * Get relationships for an entity
   */
  getRelationshipsForEntity(entityId: string): Relationship[] {
    return this.relationships.filter(
      (r) => r.source === entityId || r.target === entityId
    );
  }
}
