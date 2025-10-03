/**
 * Simple JSON formatter (ng-analyzer compatible)
 */

import type { KnowledgeGraph, ParserConfig } from '../types/index.js';

/**
 * Formats knowledge graph as simple JSON
 * Compatible with ng-analyzer output format
 */
export class SimpleJsonFormatter {
  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  format(): any {
    return {
      metadata: {
        projectName: this.graph.metadata.projectName,
        angularVersion: this.graph.metadata.angularVersion,
        totalFiles: this.countFiles(),
        totalEntities: this.graph.metadata.totalEntities,
        totalRelationships: this.graph.metadata.totalRelationships,
        generatedAt: this.graph.metadata.timestamp,
      },

      components: this.formatEntitiesByType('component'),
      services: this.formatEntitiesByType('service'),
      modules: this.formatEntitiesByType('module'),
      directives: this.formatEntitiesByType('directive'),
      pipes: this.formatEntitiesByType('pipe'),

      relationships: this.formatRelationshipsSummary(),

      structure: this.formatStructure(),
    };
  }

  private formatEntitiesByType(type: string): any[] {
    const entities = Array.from(this.graph.entities.values()).filter((e) => e.type === type);

    return entities.map((entity) => ({
      name: entity.name,
      file: entity.location.filePath,
      line: entity.location.line,
      ...this.extractTypeSpecificFields(entity),
    }));
  }

  private extractTypeSpecificFields(entity: any): any {
    const fields: any = {};

    // Component
    if (entity.selector) {
      fields.selector = entity.selector;
      fields.standalone = entity.standalone;
      fields.inputs = entity.inputs?.map((i: any) => i.name);
      fields.outputs = entity.outputs?.map((o: any) => o.name);
      fields.templateUrl = entity.templateUrl;
      fields.styleUrls = entity.styleUrls;
    }

    // Service
    if (entity.providedIn) {
      fields.providedIn = entity.providedIn;
      fields.dependencies = entity.dependencies?.map((d: any) => d.type);
    }

    // Module
    if (entity.declarations) {
      fields.declarations = entity.declarations;
      fields.imports = entity.imports;
      fields.exports = entity.exports;
      fields.providers = entity.providers;
    }

    // Directive
    if (entity.type === 'directive') {
      fields.selector = entity.selector;
      fields.standalone = entity.standalone;
    }

    // Pipe
    if (entity.pipeName) {
      fields.pipeName = entity.pipeName;
      fields.pure = entity.pure;
    }

    return fields;
  }

  private formatRelationshipsSummary(): any {
    const summary: Record<string, number> = {};

    this.graph.relationships.forEach((rel) => {
      summary[rel.type] = (summary[rel.type] || 0) + 1;
    });

    return summary;
  }

  private formatStructure(): any {
    const files = new Map<string, Set<string>>();

    this.graph.entities.forEach((entity) => {
      const file = entity.location.filePath;
      if (!files.has(file)) {
        files.set(file, new Set());
      }
      files.get(file)!.add(entity.type);
    });

    return Array.from(files.entries()).map(([file, types]) => ({
      file,
      entityTypes: Array.from(types),
    }));
  }

  private countFiles(): number {
    const files = new Set<string>();
    this.graph.entities.forEach((entity) => {
      files.add(entity.location.filePath);
    });
    return files.size;
  }
}
