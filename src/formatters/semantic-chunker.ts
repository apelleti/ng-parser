/**
 * Semantic chunker for splitting large outputs into LLM-friendly chunks
 *
 * Features:
 * - Chunks by feature boundaries (auth/, products/, admin/)
 * - Target size: ~100K tokens per chunk
 * - 10% overlap between chunks for context continuity
 * - Generates manifest.json for navigation
 */

import type { KnowledgeGraph, ParserConfig, Entity, DetailLevel } from '../types/index.js';
import { MarkdownFormatter } from './markdown-formatter.js';

export interface ChunkMetadata {
  chunkId: string;
  feature: string;
  entities: string[];
  tokenCount: number;
  relatedChunks: string[];
}

export interface ChunkManifest {
  projectName: string;
  totalEntities: number;
  totalChunks: number;
  chunks: ChunkMetadata[];
  generated: string;
}

export interface SemanticChunk {
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Semantic chunker that splits knowledge graphs into feature-based chunks
 */
export class SemanticChunker {
  private readonly TOKEN_ESTIMATE_RATIO = 0.25; // 1 char ≈ 0.25 tokens
  private readonly TARGET_TOKENS = 100_000; // Target tokens per chunk
  private readonly OVERLAP_RATIO = 0.1; // 10% overlap

  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  /**
   * Split knowledge graph into semantic chunks
   */
  async chunk(level: DetailLevel = 'detailed'): Promise<{ chunks: SemanticChunk[]; manifest: ChunkManifest }> {
    // Group entities by feature
    const featureGroups = this.groupEntitiesByFeature();

    // Estimate size of each feature
    const featureSizes = this.estimateFeatureSizes(featureGroups, level);

    // Split into chunks respecting feature boundaries
    const chunks = this.createChunks(featureGroups, featureSizes, level);

    // Generate manifest
    const manifest = this.generateManifest(chunks);

    return { chunks, manifest };
  }

  /**
   * Group entities by feature based on file path
   */
  private groupEntitiesByFeature(): Map<string, Entity[]> {
    const features = new Map<string, Entity[]>();
    const entities = Array.from(this.graph.entities.values());

    entities.forEach(entity => {
      const feature = this.extractFeature(entity.location.filePath);
      if (!features.has(feature)) {
        features.set(feature, []);
      }
      features.get(feature)!.push(entity);
    });

    return features;
  }

  /**
   * Extract feature name from file path
   */
  private extractFeature(path: string): string {
    // Pattern: src/app/[feature]/...
    const match = path.match(/\/app\/([^\/]+)\//);
    if (!match) {
      return 'core';
    }

    const featureName = match[1];

    // Group common folders as 'shared'
    if (['shared', 'core', 'common', 'utils', 'helpers'].includes(featureName)) {
      return 'shared';
    }

    return featureName;
  }

  /**
   * Estimate token size for each feature
   */
  private estimateFeatureSizes(
    featureGroups: Map<string, Entity[]>,
    level: DetailLevel
  ): Map<string, number> {
    const sizes = new Map<string, number>();

    featureGroups.forEach((entities, feature) => {
      // Create a temporary knowledge graph for this feature
      const featureGraph: KnowledgeGraph = {
        entities: new Map(entities.map(e => [e.id || e.name, e])),
        relationships: this.graph.relationships.filter(r => {
          const sourceEntity = entities.find(e => (e.id || e.name) === r.source);
          const targetEntity = entities.find(e => (e.id || e.name) === r.target);
          return sourceEntity || targetEntity;
        }),
        hierarchy: {
          id: feature,
          name: feature,
          type: 'feature',
          children: [],
          entities: entities.map(e => e.id || e.name),
        },
        metadata: {
          ...this.graph.metadata,
          totalEntities: entities.length,
        },
      };

      // Format and estimate tokens
      const formatter = new MarkdownFormatter(featureGraph, this.config, level);
      const content = formatter.format();
      const tokens = this.estimateTokens(content);

      sizes.set(feature, tokens);
    });

    return sizes;
  }

  /**
   * Create chunks from feature groups
   */
  private createChunks(
    featureGroups: Map<string, Entity[]>,
    featureSizes: Map<string, number>,
    level: DetailLevel
  ): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    let currentChunkFeatures: string[] = [];
    let currentChunkTokens = 0;
    let chunkIndex = 0;

    // Sort features by size (largest first) for better packing
    const sortedFeatures = Array.from(featureGroups.keys()).sort((a, b) => {
      return (featureSizes.get(b) || 0) - (featureSizes.get(a) || 0);
    });

    for (const feature of sortedFeatures) {
      const featureTokens = featureSizes.get(feature) || 0;

      // If feature alone exceeds target, split it into multiple chunks
      if (featureTokens > this.TARGET_TOKENS) {
        const subChunks = this.splitLargeFeature(feature, featureGroups.get(feature)!, level, chunkIndex);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
        continue;
      }

      // If adding this feature exceeds target, finalize current chunk
      if (currentChunkTokens + featureTokens > this.TARGET_TOKENS && currentChunkFeatures.length > 0) {
        const chunk = this.createMultiFeatureChunk(currentChunkFeatures, featureGroups, level, chunkIndex++);
        chunks.push(chunk);
        currentChunkFeatures = [];
        currentChunkTokens = 0;
      }

      // Add feature to current chunk
      currentChunkFeatures.push(feature);
      currentChunkTokens += featureTokens;
    }

    // Finalize last chunk
    if (currentChunkFeatures.length > 0) {
      const chunk = this.createMultiFeatureChunk(currentChunkFeatures, featureGroups, level, chunkIndex++);
      chunks.push(chunk);
    }

    // Add overlap between chunks
    this.addChunkOverlap(chunks);

    // Set related chunks
    this.setRelatedChunks(chunks, featureGroups);

    return chunks;
  }

  /**
   * Split a large feature into multiple chunks
   */
  private splitLargeFeature(
    feature: string,
    entities: Entity[],
    level: DetailLevel,
    startIndex: number
  ): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    const entitiesPerChunk = Math.ceil(entities.length / Math.ceil(entities.length / 50)); // ~50 entities per chunk

    for (let i = 0; i < entities.length; i += entitiesPerChunk) {
      const chunkEntities = entities.slice(i, i + entitiesPerChunk);
      const chunkIndex = startIndex + chunks.length;
      const partNumber = Math.floor(i / entitiesPerChunk) + 1;
      const totalParts = Math.ceil(entities.length / entitiesPerChunk);

      const featureGraph: KnowledgeGraph = {
        entities: new Map(chunkEntities.map(e => [e.id || e.name, e])),
        relationships: this.graph.relationships.filter(r => {
          const sourceEntity = chunkEntities.find(e => (e.id || e.name) === r.source);
          const targetEntity = chunkEntities.find(e => (e.id || e.name) === r.target);
          return sourceEntity || targetEntity;
        }),
        hierarchy: {
          id: `${feature}-part-${partNumber}`,
          name: `${feature} (part ${partNumber}/${totalParts})`,
          type: 'feature',
          children: [],
          entities: chunkEntities.map(e => e.id || e.name),
        },
        metadata: {
          ...this.graph.metadata,
          totalEntities: chunkEntities.length,
          projectName: `${this.graph.metadata.projectName || 'Angular Project'} - ${feature} (${partNumber}/${totalParts})`,
        },
      };

      const formatter = new MarkdownFormatter(featureGraph, this.config, level);
      const content = formatter.format();

      chunks.push({
        content,
        metadata: {
          chunkId: `chunk-${chunkIndex.toString().padStart(3, '0')}`,
          feature: `${feature} (part ${partNumber}/${totalParts})`,
          entities: chunkEntities.map(e => e.name),
          tokenCount: this.estimateTokens(content),
          relatedChunks: [],
        },
      });
    }

    return chunks;
  }

  /**
   * Create a chunk for a single feature
   */
  private createFeatureChunk(
    feature: string,
    entities: Entity[],
    level: DetailLevel,
    index: number
  ): SemanticChunk {
    const featureGraph: KnowledgeGraph = {
      entities: new Map(entities.map(e => [e.id || e.name, e])),
      relationships: this.graph.relationships.filter(r => {
        const sourceEntity = entities.find(e => (e.id || e.name) === r.source);
        const targetEntity = entities.find(e => (e.id || e.name) === r.target);
        return sourceEntity || targetEntity;
      }),
      hierarchy: {
        id: feature,
        name: feature,
        type: 'feature',
        children: [],
        entities: entities.map(e => e.id || e.name),
      },
      metadata: {
        ...this.graph.metadata,
        totalEntities: entities.length,
        projectName: `${this.graph.metadata.projectName || 'Angular Project'} - ${feature}`,
      },
    };

    const formatter = new MarkdownFormatter(featureGraph, this.config, level);
    const content = formatter.format();

    return {
      content,
      metadata: {
        chunkId: `chunk-${index.toString().padStart(3, '0')}`,
        feature,
        entities: entities.map(e => e.name),
        tokenCount: this.estimateTokens(content),
        relatedChunks: [],
      },
    };
  }

  /**
   * Create a chunk for multiple features
   */
  private createMultiFeatureChunk(
    features: string[],
    featureGroups: Map<string, Entity[]>,
    level: DetailLevel,
    index: number
  ): SemanticChunk {
    const allEntities = features.flatMap(f => featureGroups.get(f) || []);

    const featureGraph: KnowledgeGraph = {
      entities: new Map(allEntities.map(e => [e.id || e.name, e])),
      relationships: this.graph.relationships.filter(r => {
        const sourceEntity = allEntities.find(e => (e.id || e.name) === r.source);
        const targetEntity = allEntities.find(e => (e.id || e.name) === r.target);
        return sourceEntity || targetEntity;
      }),
      hierarchy: {
        id: features.join('-'),
        name: features.join(', '),
        type: 'feature',
        children: [],
        entities: allEntities.map(e => e.id || e.name),
      },
      metadata: {
        ...this.graph.metadata,
        totalEntities: allEntities.length,
        projectName: `${this.graph.metadata.projectName || 'Angular Project'} - ${features.join(', ')}`,
      },
    };

    const formatter = new MarkdownFormatter(featureGraph, this.config, level);
    const content = formatter.format();

    return {
      content,
      metadata: {
        chunkId: `chunk-${index.toString().padStart(3, '0')}`,
        feature: features.join(', '),
        entities: allEntities.map(e => e.name),
        tokenCount: this.estimateTokens(content),
        relatedChunks: [],
      },
    };
  }

  /**
   * Add overlap between adjacent chunks
   */
  private addChunkOverlap(chunks: SemanticChunk[]): void {
    // For now, overlap is handled by keeping cross-feature relationships
    // More sophisticated overlap could be added here
  }

  /**
   * Set related chunks based on entity relationships
   */
  private setRelatedChunks(chunks: SemanticChunk[], featureGroups: Map<string, Entity[]>): void {
    chunks.forEach((chunk, index) => {
      const relatedChunks = new Set<string>();

      // Find chunks that have relationships with entities in this chunk
      const chunkEntities = chunk.metadata.entities;

      this.graph.relationships.forEach(rel => {
        const sourceInChunk = chunkEntities.includes(rel.source);
        const targetInChunk = chunkEntities.includes(rel.target);

        // If relationship crosses chunk boundary, mark as related
        if (sourceInChunk !== targetInChunk) {
          chunks.forEach((otherChunk, otherIndex) => {
            if (index === otherIndex) return;

            const otherEntities = otherChunk.metadata.entities;
            if (otherEntities.includes(rel.source) || otherEntities.includes(rel.target)) {
              relatedChunks.add(otherChunk.metadata.chunkId);
            }
          });
        }
      });

      chunk.metadata.relatedChunks = Array.from(relatedChunks);
    });
  }

  /**
   * Generate manifest for all chunks
   */
  private generateManifest(chunks: SemanticChunk[]): ChunkManifest {
    return {
      projectName: this.graph.metadata.projectName || 'Angular Project',
      totalEntities: this.graph.metadata.totalEntities,
      totalChunks: chunks.length,
      chunks: chunks.map(c => c.metadata),
      generated: new Date().toISOString(),
    };
  }

  /**
   * Estimate token count from content
   */
  private estimateTokens(content: string): number {
    return Math.round(content.length * this.TOKEN_ESTIMATE_RATIO);
  }
}
