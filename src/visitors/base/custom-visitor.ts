/**
 * Base interfaces for custom visitor extensions
 */

import * as ts from 'typescript';
import type { Entity, Relationship } from '../../types/index.js';

/**
 * Warning reported by a visitor
 */
export interface VisitorWarning {
  code: string;
  message: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

/**
 * Error reported by a visitor
 */
export interface VisitorError {
  code: string;
  message: string;
  location?: {
    filePath: string;
    line: number;
    column: number;
  };
  severity: 'error' | 'warning';
  context?: Record<string, unknown>;
}

/**
 * Context available to custom visitors
 *
 * Provides access to:
 * - TypeScript AST and type checker
 * - Parsed Angular entities (readonly)
 * - Helper methods for entity lookup
 * - Storage for custom data, warnings, errors, metrics
 */
export interface VisitorContext {
  // === TypeScript AST (for AST analysis) ===
  readonly sourceFile: ts.SourceFile;
  readonly typeChecker: ts.TypeChecker;
  readonly program: ts.Program;

  // === Angular Entities (parsed by core, READONLY) ===
  readonly angularEntities: ReadonlyMap<string, Entity>;
  readonly relationships: readonly Relationship[];

  // === Entity Lookup Helpers ===

  /**
   * Find an Angular entity by its name
   */
  findEntityByName(name: string): Entity | undefined;

  /**
   * Find all entities of a specific type
   */
  findEntitiesByType(type: string): Entity[];

  /**
   * Find all relationships for a given entity
   */
  findRelationshipsForEntity(entityId: string): Relationship[];

  /**
   * Find dependencies of an entity (entities it depends on)
   */
  findDependencies(entityId: string): Entity[];

  /**
   * Find dependents of an entity (entities that depend on it)
   */
  findDependents(entityId: string): Entity[];

  /**
   * Resolve an import path to an Angular entity
   */
  resolveImport(importPath: string): Entity | undefined;

  // === Storage for Visitor Results ===

  /**
   * Store custom data for this visitor
   */
  addCustomData(key: string, value: unknown): void;

  /**
   * Retrieve custom data stored by this visitor
   */
  getCustomData(key: string): unknown;

  /**
   * Add a warning
   */
  addWarning(warning: VisitorWarning): void;

  /**
   * Add an error
   */
  addError(error: VisitorError): void;

  /**
   * Add a metric (numeric or string value)
   */
  addMetric(name: string, value: number | string): void;
}

/**
 * Custom visitor interface
 *
 * Extend this interface to create your own analysis visitors.
 * Visitors are executed AFTER core Angular parsing completes.
 *
 * @example
 * ```typescript
 * export class MyVisitor implements CustomVisitor<MyResults> {
 *   readonly name = 'MyVisitor';
 *   readonly priority = 50;
 *   readonly description = 'Analyzes...';
 *   readonly version = '1.0.0';
 *
 *   async visitNode(node: ts.Node, context: VisitorContext) {
 *     // Your logic
 *   }
 *
 *   getResults(): MyResults {
 *     return this.results;
 *   }
 * }
 * ```
 */
export interface CustomVisitor<TResult = unknown> {
  /**
   * Unique name for this visitor
   */
  readonly name: string;

  /**
   * Execution priority (0-100)
   * Higher priority visitors run first
   * Default: 50
   */
  readonly priority: number;

  /**
   * Human-readable description of what this visitor does
   */
  readonly description: string;

  /**
   * Visitor version (semver recommended)
   */
  readonly version: string;

  /**
   * Called before parsing starts (optional)
   * Use for initialization
   */
  onBeforeParse?(context: VisitorContext): void | Promise<void>;

  /**
   * Called for each TypeScript AST node
   * This is where you implement your analysis logic
   */
  visitNode(node: ts.Node, context: VisitorContext): void | Promise<void>;

  /**
   * Called for each Angular entity (optional)
   * Useful for entity-level analysis
   */
  visitEntity?(entity: Entity, context: VisitorContext): void | Promise<void>;

  /**
   * Called for each Angular relationship (optional)
   * Useful for dependency analysis
   */
  visitRelationship?(relationship: Relationship, context: VisitorContext): void | Promise<void>;

  /**
   * Called after parsing completes (optional)
   * Use for finalization and summary
   */
  onAfterParse?(context: VisitorContext): void | Promise<void>;

  /**
   * Get the results collected by this visitor
   */
  getResults(): TResult;

  /**
   * Reset visitor state (optional)
   * Called before re-parsing
   */
  reset?(): void;
}

/**
 * Base class for custom visitors
 * Provides default implementations
 */
export abstract class BaseVisitor<TResult = unknown> implements CustomVisitor<TResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly priority: number = 50;
  readonly version: string = '1.0.0';

  protected warnings: VisitorWarning[] = [];
  protected errors: VisitorError[] = [];
  protected metrics: Map<string, number | string> = new Map();

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    // Override in subclass
  }

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    // Override in subclass
  }

  async visitRelationship(relationship: Relationship, context: VisitorContext): Promise<void> {
    // Override in subclass
  }

  onBeforeParse(context: VisitorContext): void {
    this.reset();
  }

  onAfterParse(context: VisitorContext): void {
    // Override for summary logic
  }

  abstract getResults(): TResult;

  reset(): void {
    this.warnings = [];
    this.errors = [];
    this.metrics.clear();
  }

  protected addWarning(context: VisitorContext, warning: VisitorWarning): void {
    this.warnings.push(warning);
    context.addWarning(warning);
  }

  protected addError(context: VisitorContext, error: VisitorError): void {
    this.errors.push(error);
    context.addError(error);
  }

  protected addMetric(context: VisitorContext, name: string, value: number | string): void {
    this.metrics.set(name, value);
    context.addMetric(`${this.name}.${name}`, value);
  }
}
