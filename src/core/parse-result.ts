/**
 * Parse result implementation
 */

import type { ParseResult, KnowledgeGraph, ParserConfig } from '../types/index.js';
import { MarkdownFormatter } from '../formatters/markdown-formatter.js';
import { GraphRAGFormatter } from '../formatters/graphrag-formatter.js';
import { SimpleJsonFormatter } from '../formatters/simple-json-formatter.js';
import { HtmlFormatter } from '../formatters/html-formatter.js';
import { optimizeEntity, removeEmptyDefaults } from '../utils/optimization-helpers.js';

/**
 * Implementation of ParseResult
 */
export class ParseResultImpl implements ParseResult {
  constructor(
    public graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  /**
   * Export as Markdown (optimized for RAG)
   */
  toMarkdown(): string {
    const formatter = new MarkdownFormatter(this.graph, this.config);
    return formatter.format();
  }

  /**
   * Export as JSON (optimized - removes empty arrays and redundant fields)
   */
  toJSON(): any {
    // Optimize entities by removing empty defaults
    const optimizedEntities = Array.from(this.graph.entities.entries())
      .map(([, entity]) => optimizeEntity(entity));

    return removeEmptyDefaults({
      entities: optimizedEntities,
      relationships: this.graph.relationships,
      hierarchy: this.graph.hierarchy,
      metadata: this.graph.metadata,
    });
  }

  /**
   * Export as GraphRAG format
   */
  toGraphRAG(): any {
    const formatter = new GraphRAGFormatter(this.graph, this.config);
    return formatter.format();
  }

  /**
   * Export as simple JSON (ng-analyzer style)
   */
  toSimpleJSON(): any {
    const formatter = new SimpleJsonFormatter(this.graph, this.config);
    return formatter.format();
  }

  /**
   * Export as interactive HTML with D3.js visualization
   */
  toHTML(): string {
    const formatter = new HtmlFormatter(this.graph, this.config);
    return formatter.format();
  }

  /**
   * Get knowledge graph
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  /**
   * Get entities
   */
  getEntities(): Map<string, any> {
    return this.graph.entities;
  }

  /**
   * Get relationships
   */
  getRelationships(): any[] {
    return this.graph.relationships;
  }

  /**
   * Get metadata
   */
  getMetadata(): any {
    return this.graph.metadata;
  }
}
