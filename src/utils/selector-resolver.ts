/**
 * Selector Resolver
 * Maps CSS selectors to Angular entities (components/directives)
 */

import type { Entity } from '../types/index.js';

export interface SelectorMapping {
  selector: string;
  entityId: string;
  entityName: string;
  entityType: 'component' | 'directive';
}

/**
 * Resolves CSS selectors to entity IDs
 */
export class SelectorResolver {
  private selectorMap: Map<string, SelectorMapping[]> = new Map();
  private attributeMap: Map<string, SelectorMapping[]> = new Map();

  /**
   * Build selector index from entities
   */
  buildIndex(entities: Map<string, Entity>): void {
    this.selectorMap.clear();
    this.attributeMap.clear();

    for (const [id, entity] of entities) {
      if (entity.type !== 'component' && entity.type !== 'directive') {
        continue;
      }

      const selector = (entity as any).selector;
      if (!selector) continue;

      // Parse selector patterns
      const patterns = this.parseSelector(selector);

      for (const pattern of patterns) {
        const mapping: SelectorMapping = {
          selector: pattern,
          entityId: id,
          entityName: entity.name,
          entityType: entity.type,
        };

        // Element selector: mat-card-title
        if (pattern.match(/^[a-z-]+$/)) {
          const existing = this.selectorMap.get(pattern) || [];
          existing.push(mapping);
          this.selectorMap.set(pattern, existing);
        }
        // Attribute selector: [cdkVirtualScrollable] or [matButton]
        else if (pattern.startsWith('[') && pattern.endsWith(']')) {
          const attr = pattern.slice(1, -1);
          const existing = this.attributeMap.get(attr) || [];
          existing.push(mapping);
          this.attributeMap.set(attr, existing);
        }
        // Class selector: .mat-button
        else if (pattern.startsWith('.')) {
          // Store class selectors for potential matching
          const existing = this.selectorMap.get(pattern) || [];
          existing.push(mapping);
          this.selectorMap.set(pattern, existing);
        }
      }
    }

    console.log(`📋 Selector index: ${this.selectorMap.size} element selectors, ${this.attributeMap.size} attribute selectors`);
  }

  /**
   * Parse Angular selector syntax
   * Supports: element, [attribute], .class, element[attr], etc.
   */
  private parseSelector(selector: string): string[] {
    const patterns: string[] = [];

    // Split by comma for multiple selectors
    const parts = selector.split(',').map(s => s.trim());

    for (const part of parts) {
      // Match element selector: mat-card-title
      const elementMatch = part.match(/^([a-z][a-z0-9-]*)/i);
      if (elementMatch) {
        patterns.push(elementMatch[1]);
      }

      // Match attribute selectors: [matButton], [mat-button]
      const attrMatches = part.matchAll(/\[([^\]]+)\]/g);
      for (const match of attrMatches) {
        patterns.push(`[${match[1]}]`);
      }

      // Match class selectors: .mat-button
      const classMatches = part.matchAll(/\.([a-z][a-z0-9-]*)/gi);
      for (const match of classMatches) {
        patterns.push(`.${match[1]}`);
      }
    }

    return patterns;
  }

  /**
   * Resolve element selector to entity IDs
   */
  resolveElementSelector(selector: string): string[] {
    const mappings = this.selectorMap.get(selector);
    return mappings ? mappings.map(m => m.entityId) : [];
  }

  /**
   * Resolve attribute selector to entity IDs
   */
  resolveAttributeSelector(attribute: string): string[] {
    const mappings = this.attributeMap.get(attribute);
    return mappings ? mappings.map(m => m.entityId) : [];
  }

  /**
   * Resolve any selector (element or attribute) to entity IDs
   */
  resolve(selector: string): string[] {
    // Try element selector first
    let result = this.resolveElementSelector(selector);
    if (result.length > 0) return result;

    // Try attribute selector
    if (selector.startsWith('[') && selector.endsWith(']')) {
      return this.resolveAttributeSelector(selector.slice(1, -1));
    }

    // Try as attribute without brackets
    result = this.resolveAttributeSelector(selector);
    if (result.length > 0) return result;

    return [];
  }

  /**
   * Get all indexed selectors (for debugging)
   */
  getAllSelectors(): string[] {
    return [
      ...Array.from(this.selectorMap.keys()),
      ...Array.from(this.attributeMap.keys()).map(a => `[${a}]`),
    ];
  }
}
