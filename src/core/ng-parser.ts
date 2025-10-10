/**
 * NgParser - Main entry point
 * Combines core Angular parsing + custom visitors
 */

import type { CustomVisitor } from '../visitors/base/custom-visitor.js';
import { AngularCoreParser, type AngularProject } from './angular-core-parser.js';
import { VisitorEngine } from './visitor-engine.js';
import type { ParserConfig, Entity, Relationship, KnowledgeGraph } from '../types/index.js';
import { SimpleJsonFormatter } from '../formatters/simple-json-formatter.js';
import { HtmlFormatter } from '../formatters/html-formatter.js';
import { ParseResultImpl } from './parse-result.js';

/**
 * Parse result combining core + custom analysis
 */
export interface NgParseResult {
  // Core Angular entities
  entities: Map<string, Entity>;
  relationships: Relationship[];

  // Metadata
  metadata: {
    totalEntities: number;
    totalRelationships: number;
    timestamp: string;
    angularVersion?: string;
  };

  // Custom visitor results
  customAnalysis: Map<string, unknown>;
  warnings: any[];
  errors: any[];
  metrics: Map<string, number | string>;

  // Output formatters
  toJSON(): any;
  toSimpleJSON(): any;
  toHTML(): string;
}

/**
 * Main ng-parser class
 *
 * Usage:
 * ```typescript
 * const parser = new NgParser({ rootDir: './src' });
 * parser.registerVisitor(new MyCustomVisitor());
 * const result = await parser.parse();
 * ```
 */
export class NgParser {
  private coreParser: AngularCoreParser;
  private visitorEngine: VisitorEngine;

  constructor(config: Partial<ParserConfig> = {}) {
    this.coreParser = new AngularCoreParser(config);
    this.visitorEngine = new VisitorEngine();
  }

  /**
   * Register a custom visitor
   *
   * @param visitor - Custom visitor implementing CustomVisitor interface
   */
  registerVisitor(visitor: CustomVisitor): void {
    this.visitorEngine.register(visitor);
  }

  /**
   * Unregister a visitor by name
   */
  unregisterVisitor(name: string): void {
    this.visitorEngine.unregister(name);
  }

  /**
   * Get all registered visitors
   */
  getVisitors(): readonly CustomVisitor[] {
    return this.visitorEngine.getVisitors();
  }

  /**
   * Parse Angular project
   *
   * This is a two-phase process:
   * 1. Core parsing: Extract Angular entities with built-in parsers
   * 2. Custom visitors: Run user-defined analysis on the parsed entities
   */
  async parse(rootDir?: string): Promise<NgParseResult> {
    const targetDir = rootDir || process.cwd();

    console.log('📊 Phase 1: Parsing Angular entities...');
    const angularProject = await this.coreParser.parseProject({ rootDir: targetDir });

    console.log(`✅ Found ${angularProject.metadata.totalEntities} Angular entities`);
    console.log(`✅ Found ${angularProject.metadata.totalRelationships} relationships`);

    // Phase 2: Run custom visitors
    let visitorResults: {
      results: Map<string, unknown>;
      warnings: any[];
      errors: any[];
      metrics: Map<string, number | string>;
    } = {
      results: new Map<string, unknown>(),
      warnings: [],
      errors: [],
      metrics: new Map<string, number | string>(),
    };

    if (this.visitorEngine.getVisitors().length > 0) {
      console.log('\n🔌 Phase 2: Running custom visitors...');
      const program = this.coreParser.getProgram();
      if (program) {
        visitorResults = await this.visitorEngine.execute(angularProject, program);

        // Summary of visitor results
        console.log('\n📊 Visitor Results:');
        for (const [name, result] of visitorResults.results) {
          const res = result as any;
          if (res?.totalObservables !== undefined) {
            console.log(`  📡 RxJS: ${res.totalObservables} observables (${res.observablesInComponents} in components)`);
          } else if (res?.totalPatterns !== undefined) {
            const topPatterns = Object.entries(res.byPattern || {})
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 3)
              .map(([p, c]) => `${p}:${c}`)
              .join(', ');
            const icon = name.includes('Security') ? '🔒' : name.includes('Performance') ? '⚡' : '📋';
            const label = name.replace('Visitor', '');
            console.log(`  ${icon} ${label}: ${res.totalPatterns} patterns${topPatterns ? ` (${topPatterns})` : ''}`);
          }
        }
      }
    }

    // Combine results
    const result: NgParseResult = {
      entities: angularProject.entities,
      relationships: angularProject.relationships,
      metadata: angularProject.metadata,
      customAnalysis: visitorResults.results,
      warnings: visitorResults.warnings,
      errors: visitorResults.errors,
      metrics: visitorResults.metrics,

      // Formatters
      toJSON: () => {
        const knowledgeGraph = this.toKnowledgeGraph(angularProject, visitorResults);
        const config = { rootDir: targetDir, ...(this.coreParser['config'] || {}) } as ParserConfig;
        const parseResult = new ParseResultImpl(knowledgeGraph, config);
        return parseResult.toJSON();
      },
      toSimpleJSON: () => {
        const knowledgeGraph = this.toKnowledgeGraph(angularProject, visitorResults);
        const config = { rootDir: targetDir, ...(this.coreParser['config'] || {}) } as ParserConfig;
        const formatter = new SimpleJsonFormatter(knowledgeGraph, config);
        return formatter.format();
      },
      toHTML: () => {
        const knowledgeGraph = this.toKnowledgeGraph(angularProject, visitorResults);
        const config = { rootDir: targetDir, ...(this.coreParser['config'] || {}) } as ParserConfig;
        const formatter = new HtmlFormatter(knowledgeGraph, config);
        return formatter.format();
      },
    };

    return result;
  }

  /**
   * Convert AngularProject to KnowledgeGraph format for formatters
   */
  private toKnowledgeGraph(
    angularProject: AngularProject,
    visitorResults: {
      results: Map<string, unknown>;
      warnings: any[];
      errors: any[];
      metrics: Map<string, number | string>;
    }
  ): KnowledgeGraph {
    return {
      entities: angularProject.entities,
      relationships: angularProject.relationships,
      hierarchy: {
        id: 'root',
        name: 'Angular Project',
        type: 'app',
        children: [],
        entities: Array.from(angularProject.entities.keys()),
      },
      metadata: angularProject.metadata,
    };
  }
}
