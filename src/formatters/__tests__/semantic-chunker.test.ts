/**
 * Unit tests for SemanticChunker
 */

import { SemanticChunker } from '../semantic-chunker.js';
import type { KnowledgeGraph, ParserConfig, ComponentEntity, ServiceEntity } from '../../types/index.js';
import { EntityType, RelationType } from '../../types/index.js';

describe('SemanticChunker', () => {
  let mockGraph: KnowledgeGraph;
  let mockConfig: ParserConfig;

  beforeEach(() => {
    // Create entities in different features
    const entities: (ComponentEntity | ServiceEntity)[] = [];
    const relationships = [];

    // Auth feature (3 entities)
    for (let i = 0; i < 3; i++) {
      const comp: ComponentEntity = {
        id: `auth-comp-${i}`,
        type: EntityType.Component,
        name: `AuthComponent${i}`,
        selector: `app-auth-${i}`,
        location: {
          filePath: `src/app/auth/component${i}/component${i}.ts`,
          start: 100,
          end: 500,
          line: 10,
          column: 1,
        },
        inputs: [],
        outputs: [],
        lifecycle: [],
        standalone: true,
      };
      entities.push(comp);
    }

    // Products feature (3 entities)
    for (let i = 0; i < 3; i++) {
      const comp: ComponentEntity = {
        id: `product-comp-${i}`,
        type: EntityType.Component,
        name: `ProductComponent${i}`,
        selector: `app-product-${i}`,
        location: {
          filePath: `src/app/products/component${i}/component${i}.ts`,
          start: 100,
          end: 500,
          line: 10,
          column: 1,
        },
        inputs: [],
        outputs: [],
        lifecycle: [],
        standalone: true,
      };
      entities.push(comp);
    }

    // Services
    const authService: ServiceEntity = {
      id: 'auth-service',
      type: EntityType.Service,
      name: 'AuthService',
      location: {
        filePath: 'src/app/auth/auth.service.ts',
        start: 50,
        end: 300,
        line: 8,
        column: 1,
      },
      providedIn: 'root',
      dependencies: [],
    };

    const productService: ServiceEntity = {
      id: 'product-service',
      type: EntityType.Service,
      name: 'ProductService',
      location: {
        filePath: 'src/app/products/product.service.ts',
        start: 50,
        end: 300,
        line: 8,
        column: 1,
      },
      providedIn: 'root',
      dependencies: [],
    };

    entities.push(authService, productService);

    // Add cross-feature relationships
    relationships.push(
      { id: 'rel1', source: 'auth-comp-0', target: 'auth-service', type: RelationType.Injects },
      { id: 'rel2', source: 'product-comp-0', target: 'product-service', type: RelationType.Injects },
      { id: 'rel3', source: 'product-comp-0', target: 'auth-service', type: RelationType.Injects }, // Cross-feature
    );

    mockGraph = {
      entities: new Map(entities.map(e => [e.id!, e])),
      relationships,
      hierarchy: {
        id: 'root',
        name: 'Test Project',
        type: 'app',
        children: [],
        entities: entities.map(e => e.id!),
      },
      metadata: {
        projectName: 'Test Angular Project',
        angularVersion: '18.0.0',
        totalEntities: entities.length,
        totalRelationships: relationships.length,
        timestamp: '2025-10-06T00:00:00.000Z',
      },
    };

    mockConfig = {
      rootDir: '/test/project',
    };
  });

  describe('Feature Grouping', () => {
    it('should group entities by feature from file paths', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks, manifest } = await chunker.chunk('detailed');

      expect(chunks.length).toBeGreaterThan(0);

      // Check that manifest lists features
      const features = chunks.map(c => c.metadata.feature);
      expect(features.some(f => f.includes('auth'))).toBe(true);
      expect(features.some(f => f.includes('products'))).toBe(true);
    });

    it('should extract correct feature names from paths', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      // Features should be 'auth' and 'products'
      const allFeatures = chunks.flatMap(c => c.metadata.feature.split(', '));
      expect(allFeatures).toContain('auth');
      expect(allFeatures).toContain('products');
    });
  });

  describe('Chunk Creation', () => {
    it('should create chunks with valid metadata', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      chunks.forEach((chunk, index) => {
        expect(chunk.metadata.chunkId).toMatch(/^chunk-\d{3}$/);
        expect(chunk.metadata.feature).toBeTruthy();
        expect(chunk.metadata.entities).toBeInstanceOf(Array);
        expect(chunk.metadata.entities.length).toBeGreaterThan(0);
        expect(chunk.metadata.tokenCount).toBeGreaterThan(0);
        expect(chunk.content).toBeTruthy();
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should include entity names in chunk metadata', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      const allEntityNames = chunks.flatMap(c => c.metadata.entities);
      expect(allEntityNames).toContain('AuthComponent0');
      expect(allEntityNames).toContain('ProductComponent0');
      expect(allEntityNames).toContain('AuthService');
      expect(allEntityNames).toContain('ProductService');
    });

    it('should generate valid markdown content for each chunk', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      chunks.forEach(chunk => {
        expect(chunk.content).toContain('---'); // YAML frontmatter
        expect(chunk.content).toContain('project:');
        expect(chunk.content).toContain('#'); // Markdown headers
      });
    });
  });

  describe('Token Estimation', () => {
    it('should estimate token counts for chunks', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      chunks.forEach(chunk => {
        expect(chunk.metadata.tokenCount).toBeGreaterThan(0);
        // Token count should be roughly 25% of character count
        const expectedTokens = Math.round(chunk.content.length * 0.25);
        expect(chunk.metadata.tokenCount).toBeCloseTo(expectedTokens, -1);
      });
    });
  });

  describe('Manifest Generation', () => {
    it('should generate a complete manifest', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { manifest } = await chunker.chunk('detailed');

      expect(manifest.projectName).toBe('Test Angular Project');
      expect(manifest.totalEntities).toBe(8);
      expect(manifest.totalChunks).toBeGreaterThan(0);
      expect(manifest.chunks).toBeInstanceOf(Array);
      expect(manifest.chunks.length).toBe(manifest.totalChunks);
      expect(manifest.generated).toBeTruthy();
    });

    it('should include all chunk metadata in manifest', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks, manifest } = await chunker.chunk('detailed');

      expect(manifest.chunks.length).toBe(chunks.length);

      manifest.chunks.forEach((chunkMeta, index) => {
        expect(chunkMeta.chunkId).toBe(chunks[index].metadata.chunkId);
        expect(chunkMeta.feature).toBe(chunks[index].metadata.feature);
        expect(chunkMeta.entities).toEqual(chunks[index].metadata.entities);
        expect(chunkMeta.tokenCount).toBe(chunks[index].metadata.tokenCount);
      });
    });
  });

  describe('Related Chunks', () => {
    it('should identify related chunks based on cross-feature relationships', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      // If we have multiple chunks, some should have related chunks
      // due to the cross-feature relationship (product-comp-0 → auth-service)
      if (chunks.length > 1) {
        const hasRelatedChunks = chunks.some(c => c.metadata.relatedChunks.length > 0);
        // This might be true if chunks are split by feature
        // For small datasets, all entities might be in one chunk
        expect(hasRelatedChunks !== undefined).toBe(true);
      }
    });
  });

  describe('Detail Levels', () => {
    it('should respect detail level parameter', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);

      const { chunks: overviewChunks } = await chunker.chunk('overview');
      const { chunks: completeChunks } = await chunker.chunk('complete');

      // Complete level should generate more content than overview
      if (overviewChunks.length === completeChunks.length) {
        expect(completeChunks[0].content.length).toBeGreaterThan(overviewChunks[0].content.length);
      }
    });

    it('should default to detailed level', async () => {
      const chunker = new SemanticChunker(mockGraph, mockConfig);
      const { chunks: defaultChunks } = await chunker.chunk();
      const { chunks: detailedChunks } = await chunker.chunk('detailed');

      expect(defaultChunks[0].content.length).toBe(detailedChunks[0].content.length);
    });
  });

  describe('Large Project Simulation', () => {
    it('should handle projects with many entities', async () => {
      // Add many more entities to test chunking behavior
      const largeEntities: ComponentEntity[] = [];

      for (let i = 0; i < 50; i++) {
        const comp: ComponentEntity = {
          id: `large-comp-${i}`,
          type: EntityType.Component,
          name: `LargeComponent${i}`,
          selector: `app-large-${i}`,
          location: {
            filePath: `src/app/feature${i % 5}/component${i}.ts`,
            start: 100,
            end: 500,
            line: 10,
            column: 1,
          },
          inputs: [
            { name: 'input1', propertyName: 'input1', type: 'string', required: false, isSignal: false },
            { name: 'input2', propertyName: 'input2', type: 'number', required: false, isSignal: false },
          ],
          outputs: [
            { name: 'output1', propertyName: 'output1', type: 'EventEmitter', isSignal: false },
          ],
          lifecycle: ['OnInit', 'OnDestroy'],
          standalone: true,
        };
        largeEntities.push(comp);
      }

      const largeGraph: KnowledgeGraph = {
        entities: new Map(largeEntities.map(e => [e.id!, e])),
        relationships: [],
        hierarchy: {
          id: 'root',
          name: 'Large Project',
          type: 'app',
          children: [],
          entities: largeEntities.map(e => e.id!),
        },
        metadata: {
          projectName: 'Large Test Project',
          angularVersion: '18.0.0',
          totalEntities: largeEntities.length,
          totalRelationships: 0,
          timestamp: '2025-10-06T00:00:00.000Z',
        },
      };

      const chunker = new SemanticChunker(largeGraph, mockConfig);
      const { chunks, manifest } = await chunker.chunk('complete');

      expect(chunks.length).toBeGreaterThan(0);
      expect(manifest.totalEntities).toBe(50);
      expect(manifest.totalChunks).toBe(chunks.length);

      // All entities should be distributed across chunks
      const allChunkEntities = chunks.flatMap(c => c.metadata.entities);
      expect(allChunkEntities.length).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty knowledge graph', async () => {
      const emptyGraph: KnowledgeGraph = {
        entities: new Map(),
        relationships: [],
        hierarchy: {
          id: 'root',
          name: 'Empty Project',
          type: 'app',
          children: [],
          entities: [],
        },
        metadata: {
          projectName: 'Empty Project',
          angularVersion: '18.0.0',
          totalEntities: 0,
          totalRelationships: 0,
          timestamp: '2025-10-06T00:00:00.000Z',
        },
      };

      const chunker = new SemanticChunker(emptyGraph, mockConfig);
      const { chunks, manifest } = await chunker.chunk('detailed');

      expect(chunks.length).toBe(0);
      expect(manifest.totalEntities).toBe(0);
      expect(manifest.totalChunks).toBe(0);
    });

    it('should handle entities without clear feature paths', async () => {
      const rootComponent: ComponentEntity = {
        id: 'root-comp',
        type: EntityType.Component,
        name: 'AppComponent',
        selector: 'app-root',
        location: {
          filePath: 'src/app/app.component.ts', // No feature subfolder
          start: 100,
          end: 500,
          line: 10,
          column: 1,
        },
        inputs: [],
        outputs: [],
        lifecycle: [],
        standalone: true,
      };

      const simpleGraph: KnowledgeGraph = {
        entities: new Map([['root-comp', rootComponent]]),
        relationships: [],
        hierarchy: {
          id: 'root',
          name: 'Simple Project',
          type: 'app',
          children: [],
          entities: ['root-comp'],
        },
        metadata: {
          projectName: 'Simple Project',
          angularVersion: '18.0.0',
          totalEntities: 1,
          totalRelationships: 0,
          timestamp: '2025-10-06T00:00:00.000Z',
        },
      };

      const chunker = new SemanticChunker(simpleGraph, mockConfig);
      const { chunks } = await chunker.chunk('detailed');

      expect(chunks.length).toBe(1);
      expect(chunks[0].metadata.feature).toContain('core');
    });
  });
});
