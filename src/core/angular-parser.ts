/**
 * Main Angular parser
 */

import * as ts from 'typescript';
import type { ParserConfig, ParseResult, KnowledgeGraph } from '../types/index.js';
import { VisitorRegistry } from './visitor-registry.js';
import { VisitorContextImpl } from './visitor-context.js';
import { findTypeScriptFilesSync, findTsConfig, resolvePath } from '../utils/file-helpers.js';
import { ParseResultImpl } from './parse-result.js';

// Import extractors
import { ComponentExtractor } from '../extractors/component-extractor.js';
import { ServiceExtractor } from '../extractors/service-extractor.js';
import { ModuleExtractor } from '../extractors/module-extractor.js';

/**
 * Main Angular parser class
 */
export class AngularParser {
  private registry: VisitorRegistry;
  private config: Omit<Required<ParserConfig>, 'tsConfigPath'> & { tsConfigPath?: string };

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      rootDir: config.rootDir || process.cwd(),
      tsConfigPath: config.tsConfigPath,
      includeTests: config.includeTests ?? false,
      includeNodeModules: config.includeNodeModules ?? false,
      extractTemplates: config.extractTemplates ?? true,
      extractStyles: config.extractStyles ?? true,
      detectPatterns: config.detectPatterns ?? true,
      maxDepth: config.maxDepth ?? Infinity,
      strictMode: config.strictMode ?? false,
      git: config.git ?? { enabled: true },
    };

    this.registry = new VisitorRegistry();
    this.registerDefaultExtractors();
  }

  /**
   * Register default extractors
   */
  private registerDefaultExtractors(): void {
    this.registry.register(new ComponentExtractor());
    this.registry.register(new ServiceExtractor());
    this.registry.register(new ModuleExtractor());
    // More extractors will be registered as we implement them
  }

  /**
   * Parse Angular project
   */
  async parse(rootDir?: string): Promise<ParseResult> {
    const targetDir = rootDir || this.config.rootDir;

    // Find TypeScript files (using sync version for backward compatibility)
    const files = findTypeScriptFilesSync(targetDir, {
      includeTests: this.config.includeTests,
      includeNodeModules: this.config.includeNodeModules,
      maxDepth: this.config.maxDepth,
    });

    if (files.length === 0) {
      throw new Error(`No TypeScript files found in ${targetDir}`);
    }

    // Find tsconfig.json (legacy still uses sync version)
    let tsConfigPath = this.config.tsConfigPath;
    if (!tsConfigPath) {
      // For backward compatibility, we'll just use targetDir
      // The new async version would require refactoring this entire method
      tsConfigPath = targetDir;
    }

    // Create TypeScript program
    const program = this.createProgram(files, tsConfigPath);
    const typeChecker = program.getTypeChecker();

    // Collect all entities and relationships
    const allEntities = new Map();
    const allRelationships: any[] = [];

    // Process each source file
    for (const sourceFile of program.getSourceFiles()) {
      // Skip declaration files and node_modules
      if (sourceFile.isDeclarationFile) continue;
      if (!this.config.includeNodeModules && sourceFile.fileName.includes('node_modules')) {
        continue;
      }

      // Create visitor context
      const context = new VisitorContextImpl(sourceFile, typeChecker, program);

      // Traverse AST
      await this.registry.traverse(sourceFile, context);

      // Collect results
      context.entities.forEach((entity, id) => {
        allEntities.set(id, entity);
      });
      allRelationships.push(...context.relationships);
    }

    // Build knowledge graph
    const graph: KnowledgeGraph = {
      entities: allEntities,
      relationships: allRelationships,
      hierarchy: this.buildHierarchy(allEntities, allRelationships),
      metadata: {
        totalEntities: allEntities.size,
        totalRelationships: allRelationships.length,
        timestamp: new Date().toISOString(),
        patterns: this.config.detectPatterns ? this.detectPatterns(allEntities) : [],
      },
    };

    return new ParseResultImpl(graph, this.config);
  }

  /**
   * Create TypeScript program
   */
  private createProgram(files: string[], tsConfigPath: string): ts.Program {
    let options: ts.CompilerOptions;

    // Try to read tsconfig if it exists
    if (tsConfigPath && tsConfigPath.endsWith('.json')) {
      try {
        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          resolvePath(tsConfigPath, '..')
        );
        options = parsedConfig.options;
      } catch {
        // Fall back to default options
        options = this.getDefaultCompilerOptions();
      }
    } else {
      // Use default options
      options = this.getDefaultCompilerOptions();
    }

    return ts.createProgram({
      rootNames: files,
      options,
    });
  }

  /**
   * Get default compiler options
   */
  private getDefaultCompilerOptions(): ts.CompilerOptions {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
    };
  }

  /**
   * Build hierarchy from entities
   */
  private buildHierarchy(entities: Map<string, any>, relationships: any[]): any {
    // Simplified hierarchy - will be enhanced later
    return {
      id: 'root',
      name: 'Application',
      type: 'app' as const,
      children: [],
      entities: Array.from(entities.keys()),
    };
  }

  /**
   * Detect patterns in the codebase
   */
  private detectPatterns(entities: Map<string, any>): any[] {
    // Will be implemented in pattern detection phase
    return [];
  }

  /**
   * Register a custom extractor
   */
  registerExtractor(extractor: any): void {
    this.registry.register(extractor);
  }

  /**
   * Get configuration
   */
  getConfig(): ParserConfig {
    return { ...this.config };
  }
}
