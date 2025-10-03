/**
 * Performance Pattern Visitor
 * Extracts performance-relevant code patterns
 *
 * This visitor performs EXTRACTION ONLY - no evaluation or recommendations.
 * It identifies patterns that may be performance-relevant and extracts factual information.
 */

import * as ts from 'typescript';
import { BaseVisitor, type VisitorContext } from '../base';
import type { Entity, ComponentEntity } from '../../types';
import { getSourceLocation } from '../../utils/ast-helpers';

export interface PerformancePattern {
  pattern:
    | 'change_detection_default'
    | 'change_detection_onpush'
    | 'ngfor_without_trackby'
    | 'ngfor_with_trackby'
    | 'function_in_template'
    | 'http_in_constructor'
    | 'loop_in_constructor'
    | 'large_library_import'
    | 'array_chain'
    | 'indexof_in_loop'
    | 'storage_in_loop';
  entityId: string;
  entityName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  context?: string;
}

export interface PerformanceResults {
  patterns: PerformancePattern[];
  totalPatterns: number;
  byPattern: Record<string, number>;
  affectedEntities: string[];
}

/**
 * Visitor that extracts performance-relevant patterns
 *
 * Extracts:
 * - Change detection strategy
 * - *ngFor with/without trackBy
 * - Function calls in templates
 * - Heavy operations in constructors
 * - Large library imports
 * - Array operation chains
 *
 * @example
 * ```typescript
 * const parser = new NgParser();
 * parser.registerVisitor(new PerformanceVisitor());
 * const result = await parser.parse();
 * const perfResults = result.customAnalysis.get('PerformanceVisitor');
 * console.log(`Found ${perfResults.totalPatterns} performance-relevant patterns`);
 * ```
 */
export class PerformanceVisitor extends BaseVisitor<PerformanceResults> {
  readonly name = 'PerformanceVisitor';
  readonly description = 'Extracts performance-relevant code patterns';
  readonly priority = 75;
  readonly version = '1.0.0';

  private patterns: PerformancePattern[] = [];
  private currentEntity?: Entity;

  onBeforeParse(context: VisitorContext): void {
    super.onBeforeParse(context);
    // Silent - logs only at the end
  }

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    this.currentEntity = entity;

    // Extract component patterns
    if (entity.type === 'component') {
      this.extractComponentPatterns(entity as ComponentEntity, context);
    }
  }

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!this.currentEntity) return;

    // Extract constructor patterns
    this.extractConstructorPatterns(node, context);

    // Extract import patterns
    this.extractImportPatterns(node, context);

    // Extract array operation patterns
    this.extractArrayPatterns(node, context);

    // Extract storage patterns
    this.extractStoragePatterns(node, context);
  }

  onAfterParse(context: VisitorContext): void {
    const byPattern = this.patterns.reduce((acc, p) => {
      acc[p.pattern] = (acc[p.pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // No console logs - only metrics
    this.addMetric(context, 'total_performance_patterns', this.patterns.length);
    Object.entries(byPattern).forEach(([pattern, count]) => {
      this.addMetric(context, `pattern_${pattern}`, count);
    });
  }

  getResults(): PerformanceResults {
    const byPattern = this.patterns.reduce((acc, p) => {
      acc[p.pattern] = (acc[p.pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      patterns: this.patterns,
      totalPatterns: this.patterns.length,
      byPattern,
      affectedEntities: [...new Set(this.patterns.map((p) => p.entityName))],
    };
  }

  reset(): void {
    super.reset();
    this.patterns = [];
    this.currentEntity = undefined;
  }

  // === Pattern Extraction Methods ===

  private extractComponentPatterns(component: ComponentEntity, context: VisitorContext): void {
    // Extract change detection strategy
    const changeDetection = component.changeDetection;
    if (changeDetection === 'OnPush') {
      this.addPattern({
        pattern: 'change_detection_onpush',
        entityId: component.id,
        entityName: component.name,
        location: component.location,
      });
    } else if (!changeDetection || changeDetection === 'Default') {
      this.addPattern({
        pattern: 'change_detection_default',
        entityId: component.id,
        entityName: component.name,
        location: component.location,
      });
    }

    // Extract *ngFor patterns
    const template = component.template || '';
    if (template.includes('*ngFor')) {
      if (template.includes('trackBy')) {
        this.addPattern({
          pattern: 'ngfor_with_trackby',
          entityId: component.id,
          entityName: component.name,
          location: component.location,
        });
      } else {
        this.addPattern({
          pattern: 'ngfor_without_trackby',
          entityId: component.id,
          entityName: component.name,
          location: component.location,
        });
      }
    }

    // Extract function calls in templates
    if (/\{\{[^}]*\([^)]*\)[^}]*\}\}/.test(template) || /\[[^\]]*\]\s*=\s*"[^"]*\([^)]*\)"/.test(template)) {
      this.addPattern({
        pattern: 'function_in_template',
        entityId: component.id,
        entityName: component.name,
        location: component.location,
      });
    }
  }

  private extractConstructorPatterns(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isConstructorDeclaration(node)) {
      const hasHTTPCall = this.containsHTTPCall(node);
      const hasLoop = this.containsLoops(node);

      if (hasHTTPCall) {
        this.addPattern({
          pattern: 'http_in_constructor',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }

      if (hasLoop) {
        this.addPattern({
          pattern: 'loop_in_constructor',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }
    }
  }

  private extractImportPatterns(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isImportDeclaration(node)) {
      const importText = node.getText(context.sourceFile);

      // Extract large library imports
      const largeLibraries = ['lodash', 'moment', 'rxjs'];
      for (const lib of largeLibraries) {
        if (importText.includes(`from '${lib}'`) && !importText.includes(`${lib}/`)) {
          this.addPattern({
            pattern: 'large_library_import',
            entityId: this.currentEntity.id,
            entityName: this.currentEntity.name,
            location: getSourceLocation(node, context.sourceFile),
            context: lib,
          });
        }
      }
    }
  }

  private extractArrayPatterns(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isCallExpression(node)) {
      const callText = node.getText(context.sourceFile);

      // Extract chained array operations
      if (/(filter\([^)]+\)\.map|map\([^)]+\)\.filter)/.test(callText)) {
        this.addPattern({
          pattern: 'array_chain',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }

      // Extract indexOf in loops
      if (callText.includes('indexOf') && this.isInsideLoop(node)) {
        this.addPattern({
          pattern: 'indexof_in_loop',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }
    }
  }

  private extractStoragePatterns(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(context.sourceFile);

      if ((callText.includes('localStorage') || callText.includes('sessionStorage')) &&
          this.isInsideLoop(node)) {
        this.addPattern({
          pattern: 'storage_in_loop',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }
    }
  }

  // === Helper Methods ===

  private containsHTTPCall(node: ts.Node): boolean {
    let hasHTTP = false;

    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        const callText = n.expression.getText();
        if (callText.includes('http.') || callText.includes('HttpClient')) {
          hasHTTP = true;
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return hasHTTP;
  }

  private containsLoops(node: ts.Node): boolean {
    let hasLoop = false;

    const visit = (n: ts.Node): void => {
      if (ts.isForStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isForOfStatement(n)) {
        hasLoop = true;
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return hasLoop;
  }

  private isInsideLoop(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isForStatement(current) ||
          ts.isWhileStatement(current) ||
          ts.isDoStatement(current) ||
          ts.isForOfStatement(current) ||
          ts.isForInStatement(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private addPattern(pattern: PerformancePattern): void {
    this.patterns.push(pattern);
  }
}
