/**
 * Security Pattern Visitor
 * Extracts security-relevant code patterns
 *
 * This visitor performs EXTRACTION ONLY - no evaluation or severity assessment.
 * It identifies patterns that may be security-relevant and extracts factual information.
 */

import * as ts from 'typescript';
import { BaseVisitor, type VisitorContext } from '../base';
import type { Entity, ComponentEntity } from '../../types';
import { getSourceLocation } from '../../utils/ast-helpers';

export interface SecurityPattern {
  pattern:
    | 'innerHTML'
    | 'outerHTML'
    | 'bypassSecurityTrust'
    | 'eval'
    | 'Function'
    | 'http_url'
    | 'potential_secret'
    | 'xsrf_disabled';
  entityId: string;
  entityName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  context?: string;
}

export interface SecurityResults {
  patterns: SecurityPattern[];
  totalPatterns: number;
  byPattern: Record<string, number>;
  affectedEntities: string[];
}

/**
 * Visitor that extracts security-relevant patterns
 *
 * Extracts:
 * - innerHTML/outerHTML usage
 * - bypassSecurityTrust* calls
 * - eval() and Function() usage
 * - HTTP URLs (non-HTTPS)
 * - Potential hardcoded strings
 * - XSRF protection configuration
 *
 * @example
 * ```typescript
 * const parser = new NgParser();
 * parser.registerVisitor(new SecurityVisitor());
 * const result = await parser.parse();
 * const securityResults = result.customAnalysis.get('SecurityVisitor');
 * console.log(`Found ${securityResults.totalPatterns} security-relevant patterns`);
 * ```
 */
export class SecurityVisitor extends BaseVisitor<SecurityResults> {
  readonly name = 'SecurityVisitor';
  readonly description = 'Extracts security-relevant code patterns';
  readonly priority = 100;
  readonly version = '1.0.0';

  private patterns: SecurityPattern[] = [];
  private currentEntity?: Entity;

  onBeforeParse(context: VisitorContext): void {
    super.onBeforeParse(context);
    // Silent - logs only at the end
  }

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    this.currentEntity = entity;

    // Extract innerHTML/outerHTML from templates
    if (entity.type === 'component') {
      this.extractTemplatePatterns(entity as ComponentEntity, context);
    }
  }

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (!this.currentEntity) return;

    // Extract innerHTML/outerHTML assignments
    this.extractInnerHTMLUsage(node, context);

    // Extract bypassSecurityTrust* calls
    this.extractSecurityBypass(node, context);

    // Extract potential secrets
    this.extractPotentialSecrets(node, context);

    // Extract HTTP URLs
    this.extractHTTPUrls(node, context);

    // Extract eval() usage
    this.extractEvalUsage(node, context);

    // Extract XSRF configuration
    this.extractXSRFConfig(node, context);
  }

  onAfterParse(context: VisitorContext): void {
    const byPattern = this.patterns.reduce((acc, p) => {
      acc[p.pattern] = (acc[p.pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // No console logs - only metrics
    this.addMetric(context, 'total_security_patterns', this.patterns.length);
    Object.entries(byPattern).forEach(([pattern, count]) => {
      this.addMetric(context, `pattern_${pattern}`, count);
    });
  }

  getResults(): SecurityResults {
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

  private extractTemplatePatterns(component: ComponentEntity, context: VisitorContext): void {
    const template = component.template || '';

    if (template.includes('[innerHTML]')) {
      this.addPattern({
        pattern: 'innerHTML',
        entityId: component.id,
        entityName: component.name,
        location: component.location,
        context: 'template binding',
      });
    }

    if (template.includes('[outerHTML]')) {
      this.addPattern({
        pattern: 'outerHTML',
        entityId: component.id,
        entityName: component.name,
        location: component.location,
        context: 'template binding',
      });
    }
  }

  private extractInnerHTMLUsage(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isPropertyAccessExpression(node)) {
      const propertyName = node.name.getText(context.sourceFile);

      if (propertyName === 'innerHTML' || propertyName === 'outerHTML') {
        const parent = node.parent;
        if (parent && ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          this.addPattern({
            pattern: propertyName === 'innerHTML' ? 'innerHTML' : 'outerHTML',
            entityId: this.currentEntity.id,
            entityName: this.currentEntity.name,
            location: getSourceLocation(node, context.sourceFile),
            context: 'direct assignment',
          });
        }
      }
    }
  }

  private extractSecurityBypass(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(context.sourceFile);
      if (callText.includes('bypassSecurityTrust')) {
        this.addPattern({
          pattern: 'bypassSecurityTrust',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
          context: callText,
        });
      }
    }
  }

  private extractPotentialSecrets(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isStringLiteral(node)) {
      const value = node.text;
      const location = getSourceLocation(node, context.sourceFile);

      // Extract strings that look like API keys
      if (/api[_-]?key|apikey/i.test(value) && value.length > 20) {
        this.addPattern({
          pattern: 'potential_secret',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location,
          context: 'api_key_pattern',
        });
      }

      // Extract password assignments
      if (ts.isPropertyAssignment(node.parent) || ts.isVariableDeclaration(node.parent)) {
        const parentText = node.parent.getText(context.sourceFile).toLowerCase();
        if (parentText.includes('password') && value.length > 6) {
          this.addPattern({
            pattern: 'potential_secret',
            entityId: this.currentEntity.id,
            entityName: this.currentEntity.name,
            location,
            context: 'password_pattern',
          });
        }
      }

      // Extract tokens/secrets
      if (/token|secret|private[_-]?key/i.test(value) && value.length > 30) {
        this.addPattern({
          pattern: 'potential_secret',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location,
          context: 'token_pattern',
        });
      }
    }
  }

  private extractHTTPUrls(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isStringLiteral(node)) {
      const value = node.text;
      if (/^http:\/\//i.test(value) && !value.includes('localhost') && !value.includes('127.0.0.1')) {
        this.addPattern({
          pattern: 'http_url',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
          context: value,
        });
      }
    }
  }

  private extractEvalUsage(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(context.sourceFile);
      if (callText === 'eval') {
        this.addPattern({
          pattern: 'eval',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }
      if (callText === 'Function') {
        this.addPattern({
          pattern: 'Function',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
        });
      }
    }
  }

  private extractXSRFConfig(node: ts.Node, context: VisitorContext): void {
    if (!this.currentEntity) return;

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(context.sourceFile);

      if (callText.includes('withNoXsrfProtection') ||
          callText.includes('disableXSRF')) {
        this.addPattern({
          pattern: 'xsrf_disabled',
          entityId: this.currentEntity.id,
          entityName: this.currentEntity.name,
          location: getSourceLocation(node, context.sourceFile),
          context: callText,
        });
      }
    }
  }

  private addPattern(pattern: SecurityPattern): void {
    this.patterns.push(pattern);
  }
}
