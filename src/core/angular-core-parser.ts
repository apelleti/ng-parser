/**
 * Core Angular parser
 * Extracts pure Angular entities using built-in parsers
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type { Entity, Relationship, ParserConfig } from '../types';
import { ComponentParser, ServiceParser, ModuleParser, DirectiveParser, PipeParser } from './parsers';
import { VisitorContextImpl as OldVisitorContextImpl } from './visitor-context';
import { findTypeScriptFiles, findTsConfig, resolvePath } from '../utils/file-helpers';
import { EntityResolver } from './entity-resolver';
import { GitRemoteParser } from './parsers/git-remote-parser';
import type { GitRepository } from '../utils/git-helpers';

export interface AngularProject {
  entities: Map<string, Entity>;
  relationships: Relationship[];
  metadata: {
    totalEntities: number;
    totalRelationships: number;
    timestamp: string;
    angularVersion?: string;
    repository?: GitRepository;
  };
}

/**
 * Core Angular parser - extracts Angular entities
 * This parser is non-extensible and uses built-in Angular parsers only
 */
export class AngularCoreParser {
  private componentParser: ComponentParser;
  private serviceParser: ServiceParser;
  private moduleParser: ModuleParser;
  private directiveParser: DirectiveParser;
  private pipeParser: PipeParser;
  private program?: ts.Program;

  constructor(private config: Partial<ParserConfig> = {}) {
    this.componentParser = new ComponentParser();
    this.serviceParser = new ServiceParser();
    this.moduleParser = new ModuleParser();
    this.directiveParser = new DirectiveParser();
    this.pipeParser = new PipeParser();
  }

  /**
   * Parse Angular project and extract entities
   */
  async parseProject(options: { rootDir: string }): Promise<AngularProject> {
    const rootDir = options.rootDir;

    // Validate input directory
    this.validateRootDir(rootDir);

    // Find TypeScript files (now async)
    const files = await findTypeScriptFiles(rootDir, {
      includeTests: this.config.includeTests ?? false,
      includeNodeModules: false,
      maxDepth: this.config.maxDepth ?? 20,
      followSymlinks: false,
    });

    if (files.length === 0) {
      throw new Error(`No TypeScript files found in ${rootDir}`);
    }

    // Create TypeScript program
    this.program = await this.createProgram(files, rootDir);
    const typeChecker = this.program.getTypeChecker();

    // Reset parsers
    this.componentParser.reset();
    this.serviceParser.reset();
    this.moduleParser.reset();
    this.directiveParser.reset();
    this.pipeParser.reset();

    // Collect entities and relationships
    const allEntities = new Map<string, Entity>();
    const allRelationships: Relationship[] = [];

    // Process each source file
    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldSkipFile(sourceFile)) continue;

      const context = new OldVisitorContextImpl(sourceFile, typeChecker, this.program, path.resolve(rootDir));

      // Traverse AST with all parsers
      this.traverseNode(sourceFile, context);

      // Collect results with collision detection
      context.entities.forEach((entity, id) => {
        if (allEntities.has(id)) {
          const existing = allEntities.get(id)!;
          // Check if it's truly a duplicate (same file = OK, different file = collision)
          if (existing.location.filePath !== entity.location.filePath) {
            const error = new Error(
              `Duplicate entity ID detected: ${id}\n` +
              `  Existing: ${existing.name} in ${existing.location.filePath}:${existing.location.line}\n` +
              `  New: ${entity.name} in ${entity.location.filePath}:${entity.location.line}\n` +
              `This may indicate a bug in ID generation or duplicate class names.`
            );
            console.error('⚠️  ' + error.message);

            // In strict mode, throw; otherwise just warn
            if (this.config.strictMode) {
              throw error;
            }
            // Skip the duplicate
            return;
          }
        }
        allEntities.set(id, entity);
      });
      allRelationships.push(...context.relationships);
    }

    // Resolve entity IDs in relationships
    const resolver = new EntityResolver(allEntities);
    const resolvedRelationships = resolver.resolveRelationships(allRelationships);

    // Log resolution statistics
    const stats = resolver.getStats(resolvedRelationships);
    if (stats.unresolved > 0) {
      console.log(
        `📊 Entity resolution: ${stats.resolved}/${stats.total} resolved ` +
        `(${stats.unresolved} unresolved external references)`
      );
    }

    // Detect Git repository and enrich with source URLs
    let gitInfo: GitRepository | undefined;
    if (this.config.git?.enabled !== false) {
      const gitParser = new GitRemoteParser();
      gitInfo = await gitParser.detectRepository(rootDir);

      if (gitInfo) {
        gitParser.enrichEntities(allEntities);
        console.log(`📦 Git repository detected: ${gitInfo.provider} (${gitInfo.branch})`);
      }
    }

    return {
      entities: allEntities,
      relationships: resolvedRelationships,
      metadata: {
        totalEntities: allEntities.size,
        totalRelationships: resolvedRelationships.length,
        timestamp: new Date().toISOString(),
        angularVersion: this.detectAngularVersion(rootDir),
        repository: gitInfo,
      },
    };
  }

  private async createProgram(files: string[], rootDir: string): Promise<ts.Program> {
    const tsConfigPath = this.config.tsConfigPath || await findTsConfig(rootDir);
    let options: ts.CompilerOptions;

    if (tsConfigPath && tsConfigPath.endsWith('.json')) {
      try {
        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          resolvePath(tsConfigPath, '..')
        );
        options = parsedConfig.options;
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse tsconfig at ${tsConfigPath}: ${error.message}`);
        console.warn('   Falling back to default compiler options');
        options = this.getDefaultCompilerOptions();
      }
    } else {
      options = this.getDefaultCompilerOptions();
    }

    return ts.createProgram({
      rootNames: files,
      options,
    });
  }

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

  private traverseNode(node: ts.Node, context: any): void {
    // Parse with all core parsers
    this.componentParser.parse(node, context);
    this.serviceParser.parse(node, context);
    this.moduleParser.parse(node, context);
    this.directiveParser.parse(node, context);
    this.pipeParser.parse(node, context);

    // Traverse children
    ts.forEachChild(node, (child) => {
      this.traverseNode(child, context);
    });
  }

  private shouldSkipFile(sourceFile: ts.SourceFile): boolean {
    if (sourceFile.isDeclarationFile) return true;
    if (sourceFile.fileName.includes('node_modules')) return true;
    if (!this.config.includeTests && /\.(spec|test)\.ts$/.test(sourceFile.fileName)) return true;
    return false;
  }

  /**
   * Detect Angular version from package.json
   */
  private detectAngularVersion(rootDir: string): string | undefined {
    try {
      // Look for package.json in rootDir and parent directories
      let currentDir = path.resolve(rootDir);
      const root = path.parse(currentDir).root;

      while (currentDir !== root) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

          // Check dependencies and devDependencies for @angular/core
          const deps = packageJson.dependencies || {};
          const devDeps = packageJson.devDependencies || {};

          const angularCore = deps['@angular/core'] || devDeps['@angular/core'];
          if (angularCore) {
            // Remove ^ or ~ prefix
            return angularCore.replace(/^[\^~]/, '');
          }
        }

        // Move up one directory
        currentDir = path.dirname(currentDir);
      }
    } catch (error) {
      // Silently fail - version is optional
    }

    return undefined;
  }

  /**
   * Validate root directory input
   */
  private validateRootDir(rootDir: string): void {
    // Check if path is provided
    if (!rootDir || rootDir.trim() === '') {
      throw new Error('Root directory path cannot be empty');
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(rootDir);

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(
        `Root directory does not exist: ${rootDir}\n` +
        `  Resolved path: ${absolutePath}\n` +
        `  Please check that the path is correct and the directory exists.`
      );
    }

    // Check if it's a directory
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(
        `Root path is not a directory: ${rootDir}\n` +
        `  Resolved path: ${absolutePath}\n` +
        `  The path points to a file, but a directory is required.`
      );
    }

    // Check read permissions
    try {
      fs.accessSync(absolutePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(
        `No read permission for directory: ${rootDir}\n` +
        `  Resolved path: ${absolutePath}\n` +
        `  Please check file permissions.`
      );
    }
  }

  getProgram(): ts.Program | undefined {
    return this.program;
  }
}
