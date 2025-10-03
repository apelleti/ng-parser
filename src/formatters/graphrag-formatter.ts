/**
 * GraphRAG formatter (JSON-LD format)
 */

import type { KnowledgeGraph, ParserConfig, Entity, Relationship } from '../types/index.js';

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
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        angular: 'https://angular.io/api/',
        code: 'https://schema.org/SoftwareSourceCode',
      },
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
  }

  private formatEntities(): any[] {
    const entities = Array.from(this.graph.entities.values());

    return entities.map((entity) => {
      const baseNode = {
        '@id': entity.id,
        '@type': this.mapEntityTypeToSchemaType(entity.type),
        name: entity.name,
        identifier: entity.id,
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
    const attributes: Record<string, any> = {
      modifiers: entity.modifiers,
    };

    // Type-specific attributes
    if ('selector' in entity) {
      attributes.selector = (entity as any).selector;
      attributes.standalone = (entity as any).standalone;
      attributes.inputs = (entity as any).inputs;
      attributes.outputs = (entity as any).outputs;
      attributes.signals = (entity as any).signals;
      attributes.lifecycle = (entity as any).lifecycle;
    }

    if ('providedIn' in entity) {
      attributes.providedIn = (entity as any).providedIn;
      attributes.dependencies = (entity as any).dependencies;
    }

    if ('declarations' in entity) {
      attributes.declarations = (entity as any).declarations;
      attributes.imports = (entity as any).imports;
      attributes.exports = (entity as any).exports;
      attributes.providers = (entity as any).providers;
    }

    return attributes;
  }
}
