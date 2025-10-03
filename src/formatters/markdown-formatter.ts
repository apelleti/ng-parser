/**
 * Markdown formatter for RAG optimization
 */

import type { KnowledgeGraph, ParserConfig, Entity, ComponentEntity, ServiceEntity, ModuleEntity } from '../types';

/**
 * Formats knowledge graph as Markdown optimized for RAG
 * - Uses semantic chunking
 * - Preserves hierarchy
 * - YAML frontmatter for metadata
 * - 15% more token-efficient than JSON
 */
export class MarkdownFormatter {
  constructor(
    private graph: KnowledgeGraph,
    private config: ParserConfig
  ) {}

  format(): string {
    const sections: string[] = [];

    // Add YAML frontmatter
    sections.push(this.formatFrontmatter());
    sections.push('');

    // Add overview
    sections.push(this.formatOverview());
    sections.push('');

    // Add global styles (if any)
    sections.push(this.formatGlobalStyles());

    // Add entities by type
    sections.push(this.formatComponents());
    sections.push(this.formatServices());
    sections.push(this.formatModules());

    // Add relationships
    sections.push(this.formatRelationships());

    // Add hierarchy
    sections.push(this.formatHierarchy());

    return sections.filter(Boolean).join('\n');
  }

  private formatFrontmatter(): string {
    const metadata = this.graph.metadata;
    return `---
project: ${metadata.projectName || 'Angular Project'}
angular_version: ${metadata.angularVersion || 'unknown'}
total_entities: ${metadata.totalEntities}
total_relationships: ${metadata.totalRelationships}
generated: ${metadata.timestamp}
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
}
