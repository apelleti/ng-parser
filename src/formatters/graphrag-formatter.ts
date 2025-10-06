/**
 * GraphRAG formatter (JSON-LD format)
 */

import type { KnowledgeGraph, ParserConfig, Entity, Relationship } from '../types/index.js';
import { optimizeInputMetadata, optimizeOutputMetadata, removeEmptyDefaults } from '../utils/optimization-helpers.js';
import { JSONLD_CONTEXT } from './jsonld-context.js';

/**
 * Formats knowledge graph for GraphRAG consumption
 * Uses JSON-LD for semantic web compatibility
 */
export class GraphRAGFormatter {
  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  format(): any {
    const result = {
      '@context': JSONLD_CONTEXT,
      '@type': 'SoftwareApplication',
      name: this.graph.metadata.projectName || 'Angular Project',
      applicationCategory: 'WebApplication',
      programmingLanguage: {
        '@type': 'ComputerLanguage',
        name: 'TypeScript',
        version: '5.x',
      },
      runtimePlatform: {
        '@type': 'ComputerLanguage',
        name: 'Angular',
        version: this.graph.metadata.angularVersion || 'unknown',
      },
      dateCreated: this.graph.metadata.timestamp,

      // Entities as nodes
      entities: this.formatEntities(),

      // Relationships as edges
      relationships: this.formatRelationships(),

      // Community structure (hierarchical clustering)
      communities: this.formatCommunities(),

      // Metadata
      metadata: {
        totalEntities: this.graph.metadata.totalEntities,
        totalRelationships: this.graph.metadata.totalRelationships,
        patterns: this.graph.metadata.patterns,
        timestamp: this.graph.metadata.timestamp,
        globalStyles: this.graph.metadata.globalStyles,
      },
    };

    // Remove empty defaults from entire result
    return removeEmptyDefaults(result);
  }

  private formatEntities(): any[] {
    const entities = Array.from(this.graph.entities.values());

    return entities.map((entity) => {
      const baseNode = {
        '@id': entity.id,
        '@type': this.mapEntityTypeToSchemaType(entity.type),
        name: entity.name,
        description: entity.documentation,
        codeLocation: {
          '@type': 'Place',
          address: entity.location.filePath,
          line: entity.location.line,
          column: entity.location.column,
        },
        attributes: this.extractEntityAttributes(entity),
      };

      return baseNode;
    });
  }

  private formatRelationships(): any[] {
    return this.graph.relationships
      .filter((rel) => typeof rel.source === 'string' && typeof rel.target === 'string')
      .map((rel) => ({
        '@type': 'Relationship',
        '@id': rel.id,
        relationshipType: rel.type,
        source: {
          '@id': rel.source,
        },
        target: {
          '@id': rel.target,
        },
        metadata: rel.metadata,
      }));
  }

  private formatCommunities(): any[] {
    const communities: any[] = [];

    if (!this.graph.hierarchy) {
      return communities;
    }

    const traverse = (node: any, level: number) => {
      if (!node) return;

      const community = {
        '@type': 'Organization',
        '@id': node.id || `community-${level}`,
        name: node.name || 'Unknown',
        communityType: node.type || 'module',
        level,
        members: Array.isArray(node.entities)
          ? node.entities.map((id: string) => ({ '@id': id }))
          : [],
        subCommunities: Array.isArray(node.children)
          ? node.children.map((child: any) => {
              traverse(child, level + 1);
              return { '@id': child.id || `child-${level}` };
            })
          : [],
      };

      communities.push(community);
    };

    traverse(this.graph.hierarchy, 0);

    return communities;
  }

  private mapEntityTypeToSchemaType(type: string): string {
    const mapping: Record<string, string> = {
      component: 'angular:Component',
      service: 'angular:Injectable',
      module: 'angular:NgModule',
      directive: 'angular:Directive',
      pipe: 'angular:Pipe',
      class: 'code:Class',
      interface: 'code:Interface',
      function: 'code:Function',
    };

    return mapping[type] || 'code:CodeElement';
  }

  private extractEntityAttributes(entity: Entity): Record<string, any> {
    const attributes: Record<string, any> = {};

    // Only include modifiers if present
    if (entity.modifiers && entity.modifiers.length > 0) {
      attributes.modifiers = entity.modifiers;
    }

    // Type-specific attributes
    if ('selector' in entity) {
      const e = entity as any;
      if (e.selector) attributes.selector = e.selector;
      if (e.standalone !== undefined) attributes.standalone = e.standalone;

      // Optimize inputs
      if (e.inputs && e.inputs.length > 0) {
        attributes.inputs = e.inputs.map(optimizeInputMetadata);
      }

      // Optimize outputs
      if (e.outputs && e.outputs.length > 0) {
        attributes.outputs = e.outputs.map(optimizeOutputMetadata);
      }

      if (e.signals && e.signals.length > 0) attributes.signals = e.signals;
      if (e.lifecycle && e.lifecycle.length > 0) attributes.lifecycle = e.lifecycle;
    }

    if ('providedIn' in entity) {
      const e = entity as any;
      if (e.providedIn) attributes.providedIn = e.providedIn;
      if (e.dependencies && e.dependencies.length > 0) attributes.dependencies = e.dependencies;
    }

    if ('declarations' in entity) {
      const e = entity as any;
      if (e.declarations && e.declarations.length > 0) attributes.declarations = e.declarations;
      if (e.imports && e.imports.length > 0) attributes.imports = e.imports;
      if (e.exports && e.exports.length > 0) attributes.exports = e.exports;
      if (e.providers && e.providers.length > 0) attributes.providers = e.providers;
    }

    return attributes;
  }
}
