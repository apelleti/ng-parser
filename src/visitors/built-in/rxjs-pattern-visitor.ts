/**
 * RxJS Pattern Visitor
 * Extracts RxJS usage patterns (Observable, Subject, etc.)
 *
 * This visitor performs EXTRACTION ONLY - no evaluation or recommendations.
 * It identifies RxJS types and extracts factual information about their usage.
 */

import * as ts from 'typescript';
import { BaseVisitor, type VisitorContext } from '../base';
import type { Entity, ComponentEntity } from '../../types';
import { getSourceLocation } from '../../utils/ast-helpers';

export interface RxJSPattern {
  type: 'Observable' | 'Subject' | 'BehaviorSubject' | 'ReplaySubject';
  entityId: string;
  entityName: string;
  propertyName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  hasNgOnDestroy: boolean;
  isInComponent: boolean;
}

export interface RxJSPatternResults {
  patterns: RxJSPattern[];
  totalObservables: number;
  observablesInComponents: number;
  componentsWithNgOnDestroy: string[];
  componentsWithoutNgOnDestroy: string[];
}

/**
 * Visitor that extracts RxJS usage patterns
 *
 * @example
 * ```typescript
 * const parser = new NgParser();
 * parser.registerVisitor(new RxJSPatternVisitor());
 * const result = await parser.parse();
 * const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor');
 * console.log(`Found ${rxjsResults.totalObservables} RxJS observables`);
 * console.log(`${rxjsResults.observablesInComponents} in components`);
 * ```
 */
export class RxJSPatternVisitor extends BaseVisitor<RxJSPatternResults> {
  readonly name = 'RxJSPatternVisitor';
  readonly description = 'Extracts RxJS usage patterns (Observable, Subject, etc.)';
  readonly priority = 50;
  readonly version = '1.0.0';

  private patterns: RxJSPattern[] = [];
  private currentEntity?: Entity;

  onBeforeParse(context: VisitorContext): void {
    super.onBeforeParse(context);
    // Silent - logs only at the end
  }

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    this.currentEntity = entity;
  }

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!this.currentEntity) return;

    // Extract Observable properties
    if (ts.isPropertyDeclaration(node) && node.type) {
      const typeText = node.type.getText(context.sourceFile);

      if (this.isRxJSType(typeText)) {
        const propertyName = node.name.getText(context.sourceFile);
        const rxjsType = this.detectRxJSType(typeText);
        const isComponent = this.currentEntity.type === 'component';

        // Extract fact: does component have ngOnDestroy?
        const hasNgOnDestroy = isComponent
          ? this.hasNgOnDestroyLifecycle(this.currentEntity as ComponentEntity)
          : false;

        const pattern: RxJSPattern = {
          type: rxjsType,
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          propertyName,
          location: getSourceLocation(node, context.sourceFile),
          hasNgOnDestroy,
          isInComponent: isComponent,
        };

        this.patterns.push(pattern);
      }
    }
  }

  onAfterParse(context: VisitorContext): void {
    const inComponents = this.patterns.filter((p) => p.isInComponent);
    const withDestroy = [...new Set(this.patterns.filter((p) => p.hasNgOnDestroy).map((p) => p.entityName))];
    const withoutDestroy = [...new Set(this.patterns.filter((p) => p.isInComponent && !p.hasNgOnDestroy).map((p) => p.entityName))];

    // No console logs - only metrics
    this.addMetric(context, 'total_observables', this.patterns.length);
    this.addMetric(context, 'observables_in_components', inComponents.length);
    this.addMetric(context, 'components_with_ngOnDestroy', withDestroy.length);
    this.addMetric(context, 'components_without_ngOnDestroy', withoutDestroy.length);
  }

  getResults(): RxJSPatternResults {
    const inComponents = this.patterns.filter((p) => p.isInComponent);
    const withDestroy = [...new Set(this.patterns.filter((p) => p.hasNgOnDestroy).map((p) => p.entityName))];
    const withoutDestroy = [...new Set(this.patterns.filter((p) => p.isInComponent && !p.hasNgOnDestroy).map((p) => p.entityName))];

    return {
      patterns: this.patterns,
      totalObservables: this.patterns.length,
      observablesInComponents: inComponents.length,
      componentsWithNgOnDestroy: withDestroy,
      componentsWithoutNgOnDestroy: withoutDestroy,
    };
  }

  reset(): void {
    super.reset();
    this.patterns = [];
    this.currentEntity = undefined;
  }

  // === Helper methods ===

  private isRxJSType(typeText: string): boolean {
    return (
      typeText.includes('Observable') ||
      typeText.includes('Subject') ||
      typeText.includes('BehaviorSubject') ||
      typeText.includes('ReplaySubject')
    );
  }

  private detectRxJSType(typeText: string): RxJSPattern['type'] {
    if (typeText.includes('BehaviorSubject')) return 'BehaviorSubject';
    if (typeText.includes('ReplaySubject')) return 'ReplaySubject';
    if (typeText.includes('Subject')) return 'Subject';
    return 'Observable';
  }

  private hasNgOnDestroyLifecycle(component: ComponentEntity): boolean {
    return component.lifecycle?.includes('ngOnDestroy') ?? false;
  }
}
