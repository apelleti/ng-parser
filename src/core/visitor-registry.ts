/**
 * Visitor registry for plugin architecture
 */

import * as ts from 'typescript';
import type { Visitor, VisitorContext } from '../types/index.js';

/**
 * Registry for managing visitors
 */
export class VisitorRegistry {
  private visitors: Visitor[] = [];

  /**
   * Register a visitor
   */
  register(visitor: Visitor): void {
    this.visitors.push(visitor);
    // Sort by priority (higher priority first)
    this.visitors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a visitor
   */
  unregister(visitorName: string): void {
    this.visitors = this.visitors.filter((v) => v.name !== visitorName);
  }

  /**
   * Get all registered visitors
   */
  getVisitors(): Visitor[] {
    return [...this.visitors];
  }

  /**
   * Visit a node with all registered visitors
   */
  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    for (const visitor of this.visitors) {
      await visitor.visitNode(node, context);
    }
  }

  /**
   * Traverse AST and visit all nodes
   */
  async traverse(node: ts.Node, context: VisitorContext): Promise<void> {
    await this.visitNode(node, context);

    // Get all children
    const children: ts.Node[] = [];
    ts.forEachChild(node, (child) => {
      children.push(child);
    });

    // Traverse children sequentially
    for (const child of children) {
      await this.traverse(child, context);
    }
  }

  /**
   * Get results from all visitors
   */
  getAllResults(): Record<string, any> {
    const results: Record<string, any> = {};

    for (const visitor of this.visitors) {
      results[visitor.name] = visitor.getResults();
    }

    return results;
  }

  /**
   * Clear all visitors
   */
  clear(): void {
    this.visitors = [];
  }
}
