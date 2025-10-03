/**
 * Implementation of VisitorContext
 */

import * as ts from 'typescript';
import type { Entity, Relationship } from '../../types/index.js';
import type { VisitorContext, VisitorWarning, VisitorError } from './custom-visitor.js';

/**
 * Implementation of VisitorContext provided to custom visitors
 */
export class VisitorContextImpl implements VisitorContext {
  private customData: Map<string, unknown> = new Map();
  private warnings: VisitorWarning[] = [];
  private errors: VisitorError[] = [];
  private metrics: Map<string, number | string> = new Map();

  constructor(
    public readonly sourceFile: ts.SourceFile,
    public readonly typeChecker: ts.TypeChecker,
    public readonly program: ts.Program,
    public readonly angularEntities: ReadonlyMap<string, Entity>,
    public readonly relationships: readonly Relationship[]
  ) {}

  // === Entity Lookup Helpers ===

  findEntityByName(name: string): Entity | undefined {
    return Array.from(this.angularEntities.values()).find((e) => e.name === name);
  }

  findEntitiesByType(type: string): Entity[] {
    return Array.from(this.angularEntities.values()).filter((e) => e.type === type);
  }

  findRelationshipsForEntity(entityId: string): Relationship[] {
    return this.relationships.filter(
      (r) => r.source === entityId || r.target === entityId
    );
  }

  findDependencies(entityId: string): Entity[] {
    const deps: Entity[] = [];

    // Find all outgoing relationships (things this entity depends on)
    const outgoing = this.relationships.filter((r) => r.source === entityId);

    for (const rel of outgoing) {
      const target = this.angularEntities.get(rel.target);
      if (target) {
        deps.push(target);
      }
    }

    return deps;
  }

  findDependents(entityId: string): Entity[] {
    const dependents: Entity[] = [];

    // Find all incoming relationships (things that depend on this entity)
    const incoming = this.relationships.filter((r) => r.target === entityId);

    for (const rel of incoming) {
      const source = this.angularEntities.get(rel.source);
      if (source) {
        dependents.push(source);
      }
    }

    return dependents;
  }

  resolveImport(importPath: string): Entity | undefined {
    // Try to find entity by matching file path or name
    return Array.from(this.angularEntities.values()).find(
      (e) =>
        e.location.filePath.includes(importPath) ||
        e.name === importPath ||
        importPath.includes(e.name)
    );
  }

  // === Storage ===

  addCustomData(key: string, value: unknown): void {
    this.customData.set(key, value);
  }

  getCustomData(key: string): unknown {
    return this.customData.get(key);
  }

  addWarning(warning: VisitorWarning): void {
    this.warnings.push(warning);
  }

  addError(error: VisitorError): void {
    this.errors.push(error);
  }

  addMetric(name: string, value: number | string): void {
    this.metrics.set(name, value);
  }

  // === Getters for collected data ===

  getWarnings(): VisitorWarning[] {
    return [...this.warnings];
  }

  getErrors(): VisitorError[] {
    return [...this.errors];
  }

  getMetrics(): Map<string, number | string> {
    return new Map(this.metrics);
  }

  getAllCustomData(): Map<string, unknown> {
    return new Map(this.customData);
  }
}
