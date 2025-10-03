/**
 * Visitor engine - Executes custom visitors
 */

import * as ts from 'typescript';
import type { CustomVisitor } from '../visitors/base/custom-visitor';
import { VisitorContextImpl } from '../visitors/base/visitor-context-impl';
import type { AngularProject } from './angular-core-parser';

export interface VisitorResults {
  results: Map<string, unknown>;
  warnings: any[];
  errors: any[];
  metrics: Map<string, number | string>;
}

/**
 * Engine for executing custom visitors
 */
export class VisitorEngine {
  private visitors: CustomVisitor[] = [];

  /**
   * Register a custom visitor
   */
  register(visitor: CustomVisitor): void {
    // Check for duplicate names
    if (this.visitors.some((v) => v.name === visitor.name)) {
      throw new Error(`Visitor with name "${visitor.name}" already registered`);
    }

    this.visitors.push(visitor);
    // Sort by priority (higher first)
    this.visitors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a visitor by name
   */
  unregister(name: string): void {
    this.visitors = this.visitors.filter((v) => v.name !== name);
  }

  /**
   * Get all registered visitors
   */
  getVisitors(): readonly CustomVisitor[] {
    return [...this.visitors];
  }

  /**
   * Execute all registered visitors
   */
  async execute(angularProject: AngularProject, program: ts.Program): Promise<VisitorResults> {
    const results = new Map<string, unknown>();
    const allWarnings: any[] = [];
    const allErrors: any[] = [];
    const allMetrics = new Map<string, number | string>();

    if (this.visitors.length === 0) {
      return { results, warnings: allWarnings, errors: allErrors, metrics: allMetrics };
    }

    const typeChecker = program.getTypeChecker();

    for (const visitor of this.visitors) {
      console.log(`  🔌 Running ${visitor.name}...`);

      try {
        // Reset visitor if supported
        visitor.reset?.();

        // Execute for each source file
        for (const sourceFile of program.getSourceFiles()) {
          if (this.shouldSkipFile(sourceFile)) continue;

          const context = new VisitorContextImpl(
            sourceFile,
            typeChecker,
            program,
            angularProject.entities,
            angularProject.relationships
          );

          // Before parse hook
          await visitor.onBeforeParse?.(context);

          // Visit entities
          if (visitor.visitEntity) {
            for (const entity of angularProject.entities.values()) {
              try {
                await visitor.visitEntity(entity, context);
              } catch (error) {
                console.error(`  Error in ${visitor.name}.visitEntity():`, error);
                context.addError({
                  code: 'VISITOR_ENTITY_ERROR',
                  message: `Error visiting entity: ${error}`,
                  severity: 'error',
                });
              }
            }
          }

          // Visit relationships
          if (visitor.visitRelationship) {
            for (const relationship of angularProject.relationships) {
              try {
                await visitor.visitRelationship(relationship, context);
              } catch (error) {
                console.error(`  Error in ${visitor.name}.visitRelationship():`, error);
              }
            }
          }

          // Visit AST nodes
          await this.traverseNode(sourceFile, visitor, context);

          // After parse hook
          await visitor.onAfterParse?.(context);

          // Collect context results
          allWarnings.push(...context.getWarnings());
          allErrors.push(...context.getErrors());
          context.getMetrics().forEach((value, key) => {
            allMetrics.set(key, value);
          });
        }

        // Store visitor results
        results.set(visitor.name, visitor.getResults());
      } catch (error) {
        console.error(`  ❌ Error in visitor ${visitor.name}:`, error);
        allErrors.push({
          code: 'VISITOR_FAILED',
          message: `Visitor ${visitor.name} failed: ${error}`,
          severity: 'error',
        });
      }
    }

    return { results, warnings: allWarnings, errors: allErrors, metrics: allMetrics };
  }

  private async traverseNode(
    node: ts.Node,
    visitor: CustomVisitor,
    context: any
  ): Promise<void> {
    try {
      await visitor.visitNode(node, context);
    } catch (error) {
      console.error(`  Error in ${visitor.name}.visitNode():`, error);
    }

    // Traverse children in parallel with concurrency limit
    const traversals: Promise<void>[] = [];
    const CONCURRENCY_LIMIT = 10; // Limit to prevent excessive memory usage

    ts.forEachChild(node, (child) => {
      traversals.push(this.traverseNode(child, visitor, context));
    });

    // Process in batches to limit concurrency
    for (let i = 0; i < traversals.length; i += CONCURRENCY_LIMIT) {
      const batch = traversals.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(batch);
    }
  }

  private shouldSkipFile(sourceFile: ts.SourceFile): boolean {
    return (
      sourceFile.isDeclarationFile ||
      sourceFile.fileName.includes('node_modules')
    );
  }
}
