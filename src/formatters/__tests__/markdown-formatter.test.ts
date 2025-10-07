/**
 * Unit tests for MarkdownFormatter with detail levels
 */

import { MarkdownFormatter } from '../markdown-formatter.js';
import type { KnowledgeGraph, ParserConfig, ComponentEntity, ServiceEntity, DetailLevel, Entity } from '../../types/index.js';
import { EntityType, RelationType } from '../../types/index.js';

describe('MarkdownFormatter', () => {
  let mockGraph: KnowledgeGraph;
  let mockConfig: ParserConfig;

  beforeEach(() => {
    // Create mock entities
    const component1: ComponentEntity = {
      id: 'comp1',
      type: EntityType.Component,
      name: 'AuthLoginComponent',
      selector: 'app-auth-login',
      location: {
        filePath: 'src/app/auth/login/login.component.ts',
        start: 100,
        end: 500,
        line: 10,
        column: 1,
      },
      inputs: [
        { name: 'username', propertyName: 'username', type: 'string', required: true, isSignal: false },
      ],
      outputs: [
        { name: 'loginSuccess', propertyName: 'loginSuccess', type: 'EventEmitter', isSignal: false },
      ],
      lifecycle: ['OnInit'],
      standalone: true,
    };

    const component2: ComponentEntity = {
      id: 'comp2',
      type: EntityType.Component,
      name: 'ProductListComponent',
      selector: 'app-product-list',
      location: {
        filePath: 'src/app/products/list/list.component.ts',
        start: 200,
        end: 600,
        line: 15,
        column: 1,
      },
      inputs: [],
      outputs: [],
      lifecycle: [],
      standalone: false,
    };

    const service1: ServiceEntity = {
      id: 'svc1',
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
      dependencies: [
        { name: 'http', type: 'HttpClient' },
      ],
    };

    const entities = new Map<string, Entity>([
      ['comp1', component1 as Entity],
      ['comp2', component2 as Entity],
      ['svc1', service1 as Entity],
    ]);

    mockGraph = {
      entities,
      relationships: [
        { id: 'rel1', source: 'comp1', target: 'svc1', type: RelationType.Injects },
        { id: 'rel2', source: 'svc1', target: 'unresolved:HttpClient', type: RelationType.Injects },
      ],
      hierarchy: {
        id: 'root',
        name: 'Test Project',
        type: 'app',
        children: [],
        entities: ['comp1', 'comp2', 'svc1'],
      },
      metadata: {
        projectName: 'Test Angular Project',
        angularVersion: '18.0.0',
        totalEntities: 3,
        totalRelationships: 2,
        timestamp: '2025-10-06T00:00:00.000Z',
      },
    };

    mockConfig = {
      rootDir: '/test/project',
    };
  });

  describe('Detail Levels', () => {
    it('should generate overview level (ultra-compact)', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'overview');
      const output = formatter.format();

      // Overview should contain project summary
      expect(output).toContain('# Angular Project: Test Angular Project');
      expect(output).toContain('## Entity Summary');
      expect(output).toContain('**Components**: 2');
      expect(output).toContain('**Services**: 1');
      expect(output).toContain('## Features');

      // Should NOT contain full entity details
      expect(output).not.toContain('### AuthLoginComponent');
      expect(output).not.toContain('**Inputs**:');

      // Should be very short
      expect(output.length).toBeLessThan(1000);
    });

    it('should generate features level (grouped by feature)', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'features');
      const output = formatter.format();

      // Should contain feature sections
      expect(output).toContain('## Feature:');
      expect(output).toContain('auth');
      expect(output).toContain('products');

      // Should contain component names but compact
      expect(output).toContain('AuthLoginComponent');
      expect(output).toContain('ProductListComponent');
      expect(output).toContain('AuthService');

      // Should show inputs/outputs compactly
      expect(output).toContain('Inputs: username');
      expect(output).toContain('Outputs: loginSuccess');

      // Should be medium length
      expect(output.length).toBeGreaterThan(500);
      expect(output.length).toBeLessThan(2000);
    });

    it('should generate detailed level (full details without relationships)', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'detailed');
      const output = formatter.format();

      // Should contain full component details
      expect(output).toContain('## Components (2)');
      expect(output).toContain('### AuthLoginComponent');
      expect(output).toContain('**Selector**: `app-auth-login`');
      expect(output).toContain('**Inputs**:');
      expect(output).toContain('`username`: string *required*');

      // Should contain architecture context
      expect(output).toContain('**Architecture**:');
      expect(output).toContain('Injects:');

      // Should NOT contain relationships section
      expect(output).not.toContain('## Relationships');

      // Should be longer
      expect(output.length).toBeGreaterThan(1000);
    });

    it('should generate complete level (everything)', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'complete');
      const output = formatter.format();

      // Should contain everything
      expect(output).toContain('## Components (2)');
      expect(output).toContain('### AuthLoginComponent');
      expect(output).toContain('**Architecture**:');
      expect(output).toContain('## Relationships (2)');

      // Should be the longest (with relationships section)
      expect(output.length).toBeGreaterThan(1100);
    });

    it('should default to complete level when not specified', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig);
      const output = formatter.format();

      expect(output).toContain('## Relationships');
    });

    it('should include detail_level in frontmatter', () => {
      const levels: DetailLevel[] = ['overview', 'features', 'detailed', 'complete'];

      levels.forEach(level => {
        const formatter = new MarkdownFormatter(mockGraph, mockConfig, level);
        const output = formatter.format();

        expect(output).toContain(`detail_level: ${level}`);
      });
    });
  });

  describe('Feature Detection', () => {
    it('should group entities by feature from file paths', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'features');
      const output = formatter.format();

      // Should detect 'auth' and 'products' features
      expect(output).toContain('auth');
      expect(output).toContain('products');
    });

    it('should handle entities in shared/core folders', () => {
      const sharedComponent: ComponentEntity = {
        id: 'shared1',
        type: EntityType.Component,
        name: 'SharedHeaderComponent',
        selector: 'app-header',
        location: {
          filePath: 'src/app/shared/header/header.component.ts',
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

      mockGraph.entities.set('shared1', sharedComponent);
      mockGraph.metadata.totalEntities = 4;

      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'features');
      const output = formatter.format();

      expect(output).toContain('shared');
    });
  });

  describe('Architecture Context', () => {
    it('should show what entity injects', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'detailed');
      const output = formatter.format();

      expect(output).toContain('**Architecture**:');
      expect(output).toContain('Injects:');
    });

    it('should show what entities use this entity (reverse relationships)', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'detailed');
      const output = formatter.format();

      // AuthService should show it's injected by AuthLoginComponent
      expect(output).toContain('Injected by:');
    });

    it('should describe data flow for services with HttpClient', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'detailed');
      const output = formatter.format();

      // Should contain data flow description
      expect(output).toContain('**Data Flow**:');
      expect(output).toContain('HTTP requests');
      expect(output).toContain('Backend API');
    });

    it('should NOT add architecture context for overview/features levels', () => {
      const overviewFormatter = new MarkdownFormatter(mockGraph, mockConfig, 'overview');
      const overviewOutput = overviewFormatter.format();
      expect(overviewOutput).not.toContain('**Architecture**:');

      const featuresFormatter = new MarkdownFormatter(mockGraph, mockConfig, 'features');
      const featuresOutput = featuresFormatter.format();
      expect(featuresOutput).not.toContain('**Architecture**:');
    });
  });

  describe('Entity Counts', () => {
    it('should correctly count entities by type', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'overview');
      const output = formatter.format();

      expect(output).toContain('**Components**: 2');
      expect(output).toContain('**Services**: 1');
      expect(output).toContain('**Modules**: 0');
    });
  });

  describe('YAML Frontmatter', () => {
    it('should include project metadata', () => {
      const formatter = new MarkdownFormatter(mockGraph, mockConfig, 'complete');
      const output = formatter.format();

      expect(output).toContain('---');
      expect(output).toContain('project: Test Angular Project');
      expect(output).toContain('angular_version: 18.0.0');
      expect(output).toContain('total_entities: 3');
      expect(output).toContain('total_relationships: 2');
    });
  });
});
