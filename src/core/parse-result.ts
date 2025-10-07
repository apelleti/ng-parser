/**
 * Parse result implementation
 */

import type { ParseResult, KnowledgeGraph, ParserConfig, DetailLevel } from '../types/index.js';
import { MarkdownFormatter } from '../formatters/markdown-formatter.js';
import { GraphRAGFormatter } from '../formatters/graphrag-formatter.js';
import { SimpleJsonFormatter } from '../formatters/simple-json-formatter.js';
import { HtmlFormatter } from '../formatters/html-formatter.js';
import { SemanticChunker, type SemanticChunk, type ChunkManifest } from '../formatters/semantic-chunker.js';
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
   * @param level Detail level: 'overview' | 'features' | 'detailed' | 'complete'
   */
  toMarkdown(level: DetailLevel = 'complete'): string {
    const formatter = new MarkdownFormatter(this.graph, this.config, level);
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
   * Export as semantic chunks (for large projects)
   * @param level Detail level for chunks
   */
  async toMarkdownChunked(level: DetailLevel = 'detailed'): Promise<{ chunks: SemanticChunk[]; manifest: ChunkManifest }> {
    const chunker = new SemanticChunker(this.graph, this.config);
    return chunker.chunk(level);
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
