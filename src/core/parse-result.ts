/**
 * Parse result implementation
 */

import type { ParseResult, KnowledgeGraph, ParserConfig } from '../types';
import { MarkdownFormatter } from '../formatters/markdown-formatter';
import { GraphRAGFormatter } from '../formatters/graphrag-formatter';
import { SimpleJsonFormatter } from '../formatters/simple-json-formatter';

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
   * Export as JSON
   */
  toJSON(): any {
    return {
      entities: Array.from(this.graph.entities.entries()).map(([, entity]) => entity),
      relationships: this.graph.relationships,
      hierarchy: this.graph.hierarchy,
      metadata: this.graph.metadata,
    };
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
