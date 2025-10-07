/**
 * Markdown formatter for RAG optimization
 */

import type { KnowledgeGraph, ParserConfig, Entity, ComponentEntity, ServiceEntity, ModuleEntity, DetailLevel } from '../types/index.js';

interface FeatureGroup {
  name: string;
  path: string;
  entities: Entity[];
}

/**
 * Formats knowledge graph as Markdown optimized for RAG
 * - Uses semantic chunking
 * - Preserves hierarchy
 * - YAML frontmatter for metadata
 * - 15% more token-efficient than JSON
 * - Supports multiple detail levels for LLM context optimization
 */
export class MarkdownFormatter {
  private featureGroups?: Map<string, FeatureGroup>;

  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig,
    private level: DetailLevel = 'complete'
  ) {}

  format(): string {
    // Route to appropriate formatter based on detail level
    switch (this.level) {
      case 'overview':
        return this.formatOverviewLevel();
      case 'features':
        return this.formatFeaturesLevel();
      case 'detailed':
        return this.formatDetailedLevel();
      case 'complete':
      default:
        return this.formatCompleteLevel();
    }
  }

  /**
   * Overview level: Ultra-compact summary (5-10% of complete)
   * - Project metadata
   * - Entity counts by type and feature
   * - Key architectural patterns
   */
  private formatOverviewLevel(): string {
    const sections: string[] = [];
    const metadata = this.graph.metadata;

    sections.push(this.formatFrontmatter());
    sections.push('');
    sections.push(`# Angular Project: ${metadata.projectName || 'Unknown'}`);
    sections.push('');

    // Entity counts
    const entityCounts = this.getEntityCounts();
    sections.push('## Entity Summary');
    sections.push('');
    sections.push(`- **Components**: ${entityCounts.components}`);
    sections.push(`- **Services**: ${entityCounts.services}`);
    sections.push(`- **Modules**: ${entityCounts.modules}`);
    sections.push(`- **Total Relationships**: ${metadata.totalRelationships}`);
    sections.push('');

    // Feature breakdown
    const features = this.detectFeatures();
    if (features.size > 0) {
      sections.push('## Features');
      sections.push('');
      features.forEach((group, name) => {
        sections.push(`- **${name}**: ${group.entities.length} entities`);
      });
      sections.push('');
    }

    // Architectural patterns
    if (metadata.patterns && metadata.patterns.length > 0) {
      sections.push('## Architecture');
      sections.push('');
      metadata.patterns.forEach((p) => {
        sections.push(`- **${p.type}**: ${p.description}`);
      });
    }

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Features level: Grouped by feature area (20-30% of complete)
   * - One section per feature
   * - Compact entity listings with key info only
   */
  private formatFeaturesLevel(): string {
    const sections: string[] = [];
    const features = this.detectFeatures();

    sections.push(this.formatFrontmatter());
    sections.push('');
    sections.push(this.formatOverview());
    sections.push('');

    // Group entities by feature
    features.forEach((group, featureName) => {
      sections.push(`## Feature: ${featureName}`);
      sections.push('');
      sections.push(`**Path**: \`${group.path}\``);
      sections.push(`**Entities**: ${group.entities.length}`);
      sections.push('');

      // Components
      const components = group.entities.filter(e => e.type === 'component') as ComponentEntity[];
      if (components.length > 0) {
        sections.push('### Components');
        sections.push('');
        components.forEach(c => {
          sections.push(`- **${c.name}** (\`${c.selector || 'no selector'}\`)`);
          if (c.inputs && c.inputs.length > 0) {
            sections.push(`  - Inputs: ${c.inputs.map(i => i.name).join(', ')}`);
          }
          if (c.outputs && c.outputs.length > 0) {
            sections.push(`  - Outputs: ${c.outputs.map(o => o.name).join(', ')}`);
          }
        });
        sections.push('');
      }

      // Services
      const services = group.entities.filter(e => e.type === 'service' || e.type === 'injectable') as ServiceEntity[];
      if (services.length > 0) {
        sections.push('### Services');
        sections.push('');
        services.forEach(s => {
          sections.push(`- **${s.name}** (${s.providedIn || 'not provided'})`);
          if (s.dependencies && s.dependencies.length > 0) {
            sections.push(`  - Dependencies: ${s.dependencies.map(d => d.name).join(', ')}`);
          }
        });
        sections.push('');
      }

      sections.push('---');
      sections.push('');
    });

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Detailed level: Full entity details without relationships (60-70% of complete)
   */
  private formatDetailedLevel(): string {
    const sections: string[] = [];

    sections.push(this.formatFrontmatter());
    sections.push('');
    sections.push(this.formatOverview());
    sections.push('');
    sections.push(this.formatGlobalStyles());
    sections.push(this.formatComponents());
    sections.push(this.formatServices());
    sections.push(this.formatModules());
    sections.push(this.formatHierarchy());

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Complete level: Everything including relationships (100%)
   */
  private formatCompleteLevel(): string {
    const sections: string[] = [];

    sections.push(this.formatFrontmatter());
    sections.push('');
    sections.push(this.formatOverview());
    sections.push('');
    sections.push(this.formatGlobalStyles());
    sections.push(this.formatComponents());
    sections.push(this.formatServices());
    sections.push(this.formatModules());
    sections.push(this.formatRelationships());
    sections.push(this.formatHierarchy());

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Detect features from entity file paths
   * Groups entities by feature area (auth, admin, products, etc.)
   */
  private detectFeatures(): Map<string, FeatureGroup> {
    if (this.featureGroups) {
      return this.featureGroups;
    }

    const features = new Map<string, FeatureGroup>();
    const entities = Array.from(this.graph.entities.values());

    entities.forEach(entity => {
      const path = entity.location.filePath;

      // Extract feature from path: src/app/[feature]/...
      const match = path.match(/\/app\/([^\/]+)\//);
      if (!match) {
        // No clear feature, add to "core"
        const coreName = 'core';
        if (!features.has(coreName)) {
          features.set(coreName, { name: coreName, path: 'src/app', entities: [] });
        }
        features.get(coreName)!.entities.push(entity);
        return;
      }

      const featureName = match[1];

      // Skip common Angular folders
      if (['shared', 'core', 'common', 'utils', 'helpers'].includes(featureName)) {
        const sharedName = 'shared';
        if (!features.has(sharedName)) {
          features.set(sharedName, { name: sharedName, path: `src/app/${featureName}`, entities: [] });
        }
        features.get(sharedName)!.entities.push(entity);
        return;
      }

      // Add to feature group
      if (!features.has(featureName)) {
        features.set(featureName, {
          name: featureName,
          path: `src/app/${featureName}`,
          entities: []
        });
      }
      features.get(featureName)!.entities.push(entity);
    });

    this.featureGroups = features;
    return features;
  }

  /**
   * Get entity counts by type
   */
  private getEntityCounts() {
    const entities = Array.from(this.graph.entities.values());
    return {
      components: entities.filter(e => e.type === 'component').length,
      services: entities.filter(e => e.type === 'service' || e.type === 'injectable').length,
      modules: entities.filter(e => e.type === 'module').length,
      directives: entities.filter(e => e.type === 'directive').length,
      pipes: entities.filter(e => e.type === 'pipe').length,
    };
  }

  private formatFrontmatter(): string {
    const metadata = this.graph.metadata;
    return `---
project: ${metadata.projectName || 'Angular Project'}
angular_version: ${metadata.angularVersion || 'unknown'}
total_entities: ${metadata.totalEntities}
total_relationships: ${metadata.totalRelationships}
generated: ${metadata.timestamp}
detail_level: ${this.level}
---`;
  }

  private formatOverview(): string {
    const metadata = this.graph.metadata;
    return `# Angular Project Analysis

## Overview

- **Total Entities**: ${metadata.totalEntities}
- **Total Relationships**: ${metadata.totalRelationships}
- **Analysis Date**: ${new Date(metadata.timestamp).toLocaleString()}

${metadata.patterns && metadata.patterns.length > 0 ? this.formatPatterns() : ''}`;
  }

  private formatPatterns(): string {
    const patterns = this.graph.metadata.patterns || [];
    if (patterns.length === 0) return '';

    return `
## Detected Patterns

${patterns.map((p) => `- **${p.type}**: ${p.description} (${p.confidence}% confidence)`).join('\n')}`;
  }

  private formatComponents(): string {
    const components = Array.from(this.graph.entities.values()).filter(
      (e) => e.type === 'component'
    ) as ComponentEntity[];

    if (components.length === 0) return '';

    return `
## Components (${components.length})

${components.map((c) => this.formatComponent(c)).join('\n---\n\n')}`;
  }

  private formatComponent(component: ComponentEntity): string {
    const parts: string[] = [];

    parts.push(`### ${component.name}`);
    parts.push(`**File**: \`${component.location.filePath}\:${component.location.line}\``);

    if (component.documentation) {
      parts.push(`\n${component.documentation}`);
    }

    if (component.selector) {
      parts.push(`\n**Selector**: \`${component.selector}\``);
    }

    if (component.standalone) {
      parts.push(`**Type**: Standalone Component`);
    }

    if (component.inputs && component.inputs.length > 0) {
      parts.push(`\n**Inputs**:`);
      component.inputs.forEach((input) => {
        const signalBadge = input.isSignal ? ' (signal)' : '';
        const requiredBadge = input.required ? ' *required*' : '';
        parts.push(`- \`${input.name}\`: ${input.type || 'any'}${signalBadge}${requiredBadge}`);
      });
    }

    if (component.outputs && component.outputs.length > 0) {
      parts.push(`\n**Outputs**:`);
      component.outputs.forEach((output) => {
        const signalBadge = output.isSignal ? ' (signal)' : '';
        parts.push(`- \`${output.name}\`: ${output.type || 'EventEmitter'}${signalBadge}`);
      });
    }

    if (component.signals && component.signals.length > 0) {
      parts.push(`\n**Signals**:`);
      component.signals.forEach((signal) => {
        parts.push(`- \`${signal.name}\`: ${signal.signalType} (${signal.type || 'any'})`);
      });
    }

    if (component.lifecycle && component.lifecycle.length > 0) {
      parts.push(`\n**Lifecycle Hooks**: ${component.lifecycle.join(', ')}`);
    }

    if (component.changeDetection) {
      parts.push(`\n**Change Detection**: ${component.changeDetection}`);
    }

    // Add architecture context (only for detailed/complete levels)
    if (this.level === 'detailed' || this.level === 'complete') {
      const archContext = this.buildArchitectureContext(component);
      if (archContext) {
        parts.push(archContext);
      }
    }

    return parts.join('\n');
  }

  private formatServices(): string {
    const services = Array.from(this.graph.entities.values()).filter(
      (e) => e.type === 'service' || e.type === 'injectable'
    ) as ServiceEntity[];

    if (services.length === 0) return '';

    return `
## Services (${services.length})

${services.map((s) => this.formatService(s)).join('\n---\n\n')}`;
  }

  private formatService(service: ServiceEntity): string {
    const parts: string[] = [];

    parts.push(`### ${service.name}`);
    parts.push(`**File**: \`${service.location.filePath}\:${service.location.line}\``);

    if (service.documentation) {
      parts.push(`\n${service.documentation}`);
    }

    if (service.providedIn) {
      parts.push(`\n**Provided In**: \`${service.providedIn}\``);
    }

    if (service.dependencies && service.dependencies.length > 0) {
      parts.push(`\n**Dependencies**:`);
      service.dependencies.forEach((dep) => {
        const flags: string[] = [];
        if (dep.optional) flags.push('optional');
        if (dep.self) flags.push('self');
        if (dep.skipSelf) flags.push('skipSelf');
        if (dep.host) flags.push('host');

        const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        parts.push(`- \`${dep.name}\`: ${dep.type}${flagsStr}`);
      });
    }

    // Add architecture context (only for detailed/complete levels)
    if (this.level === 'detailed' || this.level === 'complete') {
      const archContext = this.buildArchitectureContext(service);
      if (archContext) {
        parts.push(archContext);
      }
    }

    return parts.join('\n');
  }

  private formatModules(): string {
    const modules = Array.from(this.graph.entities.values()).filter(
      (e) => e.type === 'module'
    ) as ModuleEntity[];

    if (modules.length === 0) return '';

    return `
## Modules (${modules.length})

${modules.map((m) => this.formatModule(m)).join('\n---\n\n')}`;
  }

  private formatModule(module: ModuleEntity): string {
    const parts: string[] = [];

    parts.push(`### ${module.name}`);
    parts.push(`**File**: \`${module.location.filePath}\:${module.location.line}\``);

    if (module.documentation) {
      parts.push(`\n${module.documentation}`);
    }

    if (module.imports && module.imports.length > 0) {
      parts.push(`\n**Imports**: ${module.imports.join(', ')}`);
    }

    if (module.declarations && module.declarations.length > 0) {
      parts.push(`\n**Declarations**: ${module.declarations.join(', ')}`);
    }

    if (module.exports && module.exports.length > 0) {
      parts.push(`\n**Exports**: ${module.exports.join(', ')}`);
    }

    if (module.providers && module.providers.length > 0) {
      parts.push(`\n**Providers**: ${module.providers.join(', ')}`);
    }

    if (module.bootstrap && module.bootstrap.length > 0) {
      parts.push(`\n**Bootstrap**: ${module.bootstrap.join(', ')}`);
    }

    return parts.join('\n');
  }

  private formatRelationships(): string {
    const relationships = this.graph.relationships;
    if (relationships.length === 0) return '';

    const grouped = new Map<string, typeof relationships>();

    relationships.forEach((rel) => {
      if (!grouped.has(rel.type)) {
        grouped.set(rel.type, []);
      }
      grouped.get(rel.type)!.push(rel);
    });

    const parts: string[] = [`\n## Relationships (${relationships.length})\n`];

    grouped.forEach((rels, type) => {
      parts.push(`### ${type} (${rels.length})`);
      parts.push('');
      rels.slice(0, 20).forEach((rel) => {
        parts.push(`- \`${rel.source}\` → \`${rel.target}\``);
      });
      if (rels.length > 20) {
        parts.push(`\n*...and ${rels.length - 20} more*`);
      }
      parts.push('');
    });

    return parts.join('\n');
  }

  private formatGlobalStyles(): string {
    const globalStyles = this.graph.metadata.globalStyles;
    if (!globalStyles || globalStyles.length === 0) {
      return '';
    }

    const parts: string[] = ['\n## Global Styles\n'];

    globalStyles.forEach((styleFile: any) => {
      parts.push(`### ${styleFile.filePath}`);
      if (styleFile.sourceUrl) {
        parts.push(`**Source**: [${styleFile.filePath}](${styleFile.sourceUrl})`);
      }
      parts.push('');

      if (styleFile.uses && styleFile.uses.length > 0) {
        parts.push('**@use statements:**');
        styleFile.uses.forEach((use: any) => {
          parts.push(`- \`${use.statement}\` (line ${use.line})${use.namespace ? ` as ${use.namespace}` : ''}`);
        });
        parts.push('');
      }

      if (styleFile.imports && styleFile.imports.length > 0) {
        parts.push('**@import statements:**');
        styleFile.imports.forEach((imp: any) => {
          parts.push(`- \`${imp.statement}\` (line ${imp.line})`);
        });
        parts.push('');
      }

      parts.push('---');
    });

    return parts.join('\n');
  }

  private formatHierarchy(): string {
    if (!this.graph.hierarchy) {
      return '';
    }

    return `
## Project Hierarchy

${this.formatHierarchyNode(this.graph.hierarchy, 0)}`;
  }

  private formatHierarchyNode(node: any, depth: number): string {
    if (!node) return '';

    const indent = '  '.repeat(depth);
    const parts: string[] = [];

    parts.push(`${indent}- **${node.name || 'Unknown'}** (${node.type || 'unknown'})`);

    if (Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach((child: any) => {
        const childNode = this.formatHierarchyNode(child, depth + 1);
        if (childNode) {
          parts.push(childNode);
        }
      });
    }

    return parts.join('\n');
  }

  /**
   * Build architecture context showing relationships and data flow
   */
  private buildArchitectureContext(entity: Entity): string {
    const parts: string[] = [];
    const entityId = entity.id || entity.name;

    // Find relationships involving this entity
    const usesRels = this.graph.relationships.filter(r => r.source === entityId);
    const usedByRels = this.graph.relationships.filter(r => r.target === entityId);

    if (usesRels.length === 0 && usedByRels.length === 0) {
      return ''; // No relationships to show
    }

    parts.push('\n**Architecture**:\n');

    // What this entity uses/depends on
    if (usesRels.length > 0) {
      const byType = new Map<string, string[]>();
      usesRels.forEach(rel => {
        if (!byType.has(rel.type)) {
          byType.set(rel.type, []);
        }
        byType.get(rel.type)!.push(rel.target);
      });

      byType.forEach((targets, relType) => {
        const typeLabel = this.formatRelationshipType(relType);
        parts.push(`- ${typeLabel}: ${targets.map(t => `\`${t}\``).join(', ')}`);
      });
    }

    // What uses/depends on this entity (reverse relationships)
    if (usedByRels.length > 0) {
      const byType = new Map<string, string[]>();
      usedByRels.forEach(rel => {
        if (!byType.has(rel.type)) {
          byType.set(rel.type, []);
        }
        byType.get(rel.type)!.push(rel.source);
      });

      byType.forEach((sources, relType) => {
        const typeLabel = this.formatRelationshipType(relType, true);
        parts.push(`- ${typeLabel}: ${sources.map(s => `\`${s}\``).join(', ')}`);
      });
    }

    // Add data flow description for services
    if (entity.type === 'service' || entity.type === 'injectable') {
      const dataFlow = this.describeDataFlow(entity as ServiceEntity, usesRels, usedByRels);
      if (dataFlow) {
        parts.push(`\n**Data Flow**: ${dataFlow}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Format relationship type into readable label
   */
  private formatRelationshipType(type: string, reverse: boolean = false): string {
    const labels: Record<string, { forward: string; backward: string }> = {
      'uses': { forward: 'Uses', backward: 'Used by' },
      'injects': { forward: 'Injects', backward: 'Injected by' },
      'imports': { forward: 'Imports', backward: 'Imported by' },
      'exports': { forward: 'Exports', backward: 'Exported by' },
      'declares': { forward: 'Declares', backward: 'Declared in' },
      'provides': { forward: 'Provides', backward: 'Provided by' },
      'extends': { forward: 'Extends', backward: 'Extended by' },
      'implements': { forward: 'Implements', backward: 'Implemented by' },
      'calls': { forward: 'Calls', backward: 'Called by' },
    };

    const label = labels[type];
    if (!label) {
      return reverse ? `Referenced by (${type})` : `References (${type})`;
    }

    return reverse ? label.backward : label.forward;
  }

  /**
   * Describe data flow for a service
   */
  private describeDataFlow(service: ServiceEntity, usesRels: any[], usedByRels: any[]): string {
    const parts: string[] = [];

    // Identify HTTP dependencies
    const hasHttpClient = service.dependencies?.some(d =>
      d.type === 'HttpClient' || d.name === 'http' || d.name === 'httpClient'
    );

    // Identify what components use this service
    const consumers = usedByRels
      .filter(rel => rel.type === 'injects')
      .map(rel => {
        const entity = this.graph.entities.get(rel.source);
        return entity?.type === 'component' ? rel.source : null;
      })
      .filter(Boolean);

    // Build data flow description
    if (consumers.length > 0) {
      parts.push(`Components (${consumers.join(', ')})`);
    }

    if (hasHttpClient) {
      parts.push('→ HTTP requests');
      parts.push('→ Backend API');
    } else if (service.dependencies && service.dependencies.length > 0) {
      const depNames = service.dependencies.map(d => d.name).join(', ');
      parts.push(`→ Uses ${depNames}`);
    }

    if (parts.length > 0) {
      parts.push('→ Returns data/state');
    }

    return parts.length > 0 ? parts.join(' ') : '';
  }
}
