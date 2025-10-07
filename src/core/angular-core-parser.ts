/**
 * Core Angular parser
 * Extracts pure Angular entities using built-in parsers
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type { Entity, Relationship, ParserConfig, StyleFileMetadata } from '../types/index.js';
import { RelationType } from '../types/index.js';
import { ComponentParser, ServiceParser, ModuleParser, DirectiveParser, PipeParser, ConstantParser, TemplateParser, StyleParser } from './parsers/index.js';
import { VisitorContextImpl as OldVisitorContextImpl } from './visitor-context.js';
import { findTypeScriptFiles, findTsConfig, resolvePath } from '../utils/file-helpers.js';
import { EntityResolver } from './entity-resolver.js';
import { GitRemoteParser } from './parsers/git-remote-parser.js';
import { SelectorResolver } from '../utils/selector-resolver.js';
import type { GitRepository } from '../utils/git-helpers.js';
import type { ComponentEntity } from '../types/index.js';
import { parseScssFile } from '../utils/style-helpers.js';
import { loadAngularCompiler } from '../utils/template-helpers.js';
import { loadPackageJson, getDependencyInfo } from '../utils/package-helpers.js';
import { loadTsConfig } from '../utils/tsconfig-helpers.js';
import { isAngularStructuralElement, isAngularBuiltinPipe } from '../utils/angular-builtin-registry.js';

export interface AngularProject {
  entities: Map<string, Entity>;
  relationships: Relationship[];
  metadata: {
    totalEntities: number;
    totalRelationships: number;
    timestamp: string;
    angularVersion?: string;
    repository?: GitRepository;
    globalStyles?: StyleFileMetadata[];
    dependencies?: import('../types/index.js').DependencyInfo;
    typescript?: import('../types/index.js').TypeScriptConfig;
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
  private constantParser: ConstantParser;
  private program?: ts.Program;

  constructor(private config: Partial<ParserConfig> = {}) {
    this.componentParser = new ComponentParser();
    this.serviceParser = new ServiceParser();
    this.moduleParser = new ModuleParser();
    this.directiveParser = new DirectiveParser();
    this.pipeParser = new PipeParser();
    this.constantParser = new ConstantParser();
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

    // Detect Git repository FIRST (needed for paths)
    let gitInfo: GitRepository | undefined;
    if (this.config.git?.enabled !== false) {
      const gitParser = new GitRemoteParser();
      gitInfo = await gitParser.detectRepository(rootDir);

      if (gitInfo) {
        console.log(`📦 Git repository detected: ${gitInfo.provider} (${gitInfo.branch})`);
      }
    }

    // Reset parsers
    this.componentParser.reset();
    this.serviceParser.reset();
    this.moduleParser.reset();
    this.directiveParser.reset();
    this.pipeParser.reset();
    this.constantParser.reset();

    // Load package.json for dependency classification
    const packageInfo = loadPackageJson(rootDir);
    if (packageInfo) {
      console.log(`📦 Loaded package.json: ${packageInfo.name || 'unknown'}`);
    }

    // Load tsconfig.json for TypeScript configuration
    const tsConfig = loadTsConfig(rootDir);
    if (tsConfig) {
      console.log(`⚙️  Loaded tsconfig.json (target: ${tsConfig.target || 'unknown'})`);
    }

    // Collect entities and relationships
    const allEntities = new Map<string, Entity>();
    const allRelationships: Relationship[] = [];
    const sourceFileMap = new Map<string, ts.SourceFile>();

    // Process each source file
    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldSkipFile(sourceFile)) continue;

      const context = new OldVisitorContextImpl(
        sourceFile,
        typeChecker,
        this.program,
        path.resolve(rootDir),
        gitInfo
      );

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
        // Map entity to source file for import resolution
        sourceFileMap.set(id, sourceFile);
      });
      allRelationships.push(...context.relationships);
    }

    // Resolve entity IDs and classify dependencies (internal vs external)
    const resolver = new EntityResolver(
      allEntities,
      this.program,
      path.resolve(rootDir),
      packageInfo
    );
    const resolvedRelationships = resolver.resolveRelationships(
      allRelationships,
      sourceFileMap
    );

    // Log resolution statistics
    const stats = resolver.getStats(resolvedRelationships);
    if (stats.unresolved > 0) {
      console.log(
        `📊 Entity resolution: ${stats.resolved}/${stats.total} resolved ` +
        `(${stats.unresolved} unresolved external references)`
      );
    }

    // Enrich entities with Git source URLs (gitInfo already detected earlier)
    if (gitInfo) {
      const gitParser = new GitRemoteParser();
      gitParser.enrichEntities(allEntities, gitInfo);
    }

    // Load Angular compiler before parsing templates
    // This ensures the compiler is available for template analysis
    await loadAngularCompiler();

    // Build selector index for resolving template selectors to entities
    const selectorResolver = new SelectorResolver();
    selectorResolver.buildIndex(allEntities);

    // Parse templates and styles for components
    const templateParser = new TemplateParser();
    const styleParser = new StyleParser();

    for (const entity of allEntities.values()) {
      if (entity.type === 'component') {
        const component = entity as ComponentEntity;

        // Parse template (inline or external)
        const { templateLocation, templateAnalysis } = templateParser.parseTemplate(
          component,
          path.resolve(rootDir),
          gitInfo
        );
        component.templateLocation = templateLocation;
        component.templateAnalysis = templateAnalysis;

        // Create relationships based on template analysis
        if (templateAnalysis) {
          // Track created relationships to avoid duplicates
          const createdRelationships = new Set<string>();

          // Components used in template
          templateAnalysis.usedComponents.forEach((selector) => {
            // Resolve selector to entity IDs
            const entityIds = selectorResolver.resolve(selector);

            if (entityIds.length > 0) {
              // Create relationships to resolved entities
              entityIds.forEach(entityId => {
                const relKey = `${component.id}::${entityId}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:${entityId}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: entityId,
                    metadata: {
                      templateUsage: 'component',
                      selector,
                      classification: 'internal',
                      resolved: true,
                    },
                  });
                }
              });
            } else {
              // Check if it's an Angular built-in structural element
              if (isAngularStructuralElement(selector)) {
                // Angular built-in (ng-content, ng-container, ng-template)
                const relKey = `${component.id}::${selector}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:angular-builtin:${selector}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: `angular-builtin:${selector}`,
                    metadata: {
                      templateUsage: 'component',
                      selector,
                      classification: 'external',
                      packageName: '@angular/core',
                      resolved: true,
                    },
                  });
                }
              } else {
                // Keep unresolved selector for visibility
                const relKey = `${component.id}::${selector}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:${selector}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: selector,
                    metadata: {
                      templateUsage: 'component',
                      selector,
                      unresolved: true,
                      classification: 'unresolved',
                      resolved: false,
                    },
                  });
                }
              }
            }
          });

          // Directives used in template
          templateAnalysis.usedDirectives.forEach((selector) => {
            // Resolve selector to entity IDs
            const entityIds = selectorResolver.resolve(selector);

            if (entityIds.length > 0) {
              // Create relationships to resolved entities
              entityIds.forEach(entityId => {
                const relKey = `${component.id}::${entityId}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:${entityId}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: entityId,
                    metadata: {
                      templateUsage: 'directive',
                      selector,
                      classification: 'internal',
                      resolved: true,
                    },
                  });
                }
              });
            } else {
              // Check if it's an Angular built-in structural element
              if (isAngularStructuralElement(selector)) {
                // Angular built-in (ng-content, ng-container, ng-template)
                const relKey = `${component.id}::${selector}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:angular-builtin:${selector}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: `angular-builtin:${selector}`,
                    metadata: {
                      templateUsage: 'directive',
                      selector,
                      classification: 'external',
                      packageName: '@angular/core',
                      resolved: true,
                    },
                  });
                }
              } else {
                // Keep unresolved selector for visibility
                const relKey = `${component.id}::${selector}::usesInTemplate`;
                if (!createdRelationships.has(relKey)) {
                  createdRelationships.add(relKey);
                  resolvedRelationships.push({
                    id: `${component.id}:usesInTemplate:${selector}`,
                    type: RelationType.UsesInTemplate,
                    source: component.id,
                    target: selector,
                    metadata: {
                      templateUsage: 'directive',
                      selector,
                      unresolved: true,
                      classification: 'unresolved',
                      resolved: false,
                    },
                  });
                }
              }
            }
          });

          // Pipes used in template
          templateAnalysis.usedPipes.forEach((pipe) => {
            const relKey = `${component.id}::${pipe}::usesInTemplate`;
            if (!createdRelationships.has(relKey)) {
              createdRelationships.add(relKey);

              // Check if it's an Angular built-in pipe
              if (isAngularBuiltinPipe(pipe)) {
                // Angular built-in pipe (async, json, date, etc.)
                resolvedRelationships.push({
                  id: `${component.id}:usesInTemplate:angular-builtin:${pipe}`,
                  type: RelationType.UsesInTemplate,
                  source: component.id,
                  target: `angular-builtin:pipe:${pipe}`,
                  metadata: {
                    templateUsage: 'pipe',
                    classification: 'external',
                    packageName: '@angular/common',
                    resolved: true,
                  },
                });
              } else {
                // Check if pipe exists as an entity
                const pipeExists = Array.from(allEntities.values()).some(
                  e => e.type === 'pipe' && (e as any).pipeName === pipe
                );

                resolvedRelationships.push({
                  id: `${component.id}:usesInTemplate:${pipe}`,
                  type: RelationType.UsesInTemplate,
                  source: component.id,
                  target: pipe,
                  metadata: {
                    templateUsage: 'pipe',
                    unresolved: !pipeExists,
                    classification: pipeExists ? 'internal' : 'unresolved',
                    resolved: pipeExists,
                  },
                });
              }
            }
          });
        }

        // Parse styles
        const { styleLocations, styleAnalysis } = styleParser.parseStyles(
          component,
          path.resolve(rootDir),
          gitInfo
        );
        component.styleLocations = styleLocations;
        component.styleAnalysis = styleAnalysis;
      }
    }

    // Scan for global SCSS files
    const globalStyles = this.scanGlobalStyles(rootDir, gitInfo);
    if (globalStyles.length > 0) {
      console.log(`📦 Found ${globalStyles.length} global style file(s)`);
    }

    // Count external dependencies in relationships
    const externalCount = resolvedRelationships.filter(
      r => r.metadata?.classification === 'external'
    ).length;

    // Global deduplication: remove any remaining duplicate relationships
    // Note: This handles duplicates from entity parsers (provides, injects, imports)
    // Template relationships are already deduplicated during creation
    const uniqueRelationships: Relationship[] = [];
    const seenRelationships = new Set<string>();

    for (const rel of resolvedRelationships) {
      const relKey = `${rel.source}::${rel.target}::${rel.type}`;
      if (!seenRelationships.has(relKey)) {
        seenRelationships.add(relKey);

        // Ensure all relationships have a classification
        // Some complex expressions (arrow functions, object literals) may not have been classified
        if (!rel.metadata || !rel.metadata.classification) {
          uniqueRelationships.push({
            ...rel,
            metadata: {
              ...rel.metadata,
              classification: 'unresolved',
              resolved: false,
            },
          });
        } else {
          uniqueRelationships.push(rel);
        }
      }
    }

    const duplicatesRemoved = resolvedRelationships.length - uniqueRelationships.length;
    if (duplicatesRemoved > 0) {
      console.log(`🔧 Removed ${duplicatesRemoved} duplicate relationship(s)`);
    }

    // Note on self-references:
    // Some relationships may have source === target (e.g., MatFormField provides MatFormField).
    // This is legitimate Angular pattern for self-providing components and should not be filtered.

    return {
      entities: allEntities,
      relationships: uniqueRelationships,
      metadata: {
        totalEntities: allEntities.size,
        totalRelationships: uniqueRelationships.length,
        timestamp: new Date().toISOString(),
        angularVersion: this.detectAngularVersion(rootDir),
        repository: gitInfo,
        globalStyles: globalStyles.length > 0 ? globalStyles : undefined,
        dependencies: getDependencyInfo(packageInfo, externalCount),
        typescript: tsConfig || undefined,
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
    this.constantParser.parse(node, context);

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
            // Ignore workspace/catalog/link formats (npm workspace catalogs)
            if (!angularCore.match(/^(catalog:|workspace:|link:|file:)/)) {
              // Remove ^ or ~ prefix
              return angularCore.replace(/^[\^~]/, '');
            }
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

  /**
   * Scan for global SCSS files at common locations
   */
  private scanGlobalStyles(rootDir: string, gitInfo?: GitRepository): StyleFileMetadata[] {
    const globalStyles: StyleFileMetadata[] = [];
    const absoluteRootDir = path.resolve(rootDir);

    // Common locations for global styles (check both root and src/)
    const searchDirs = [
      absoluteRootDir,
      path.join(absoluteRootDir, 'src'),
    ];

    const commonStyleNames = [
      'styles.scss',
      'style.scss',
      'theme.scss',
      'variables.scss',
      '_variables.scss',
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      for (const styleName of commonStyleNames) {
        const stylePath = path.join(dir, styleName);

        if (fs.existsSync(stylePath)) {
          try {
            const styleFile = parseScssFile(stylePath, absoluteRootDir, gitInfo);
            globalStyles.push(styleFile);
          } catch (error) {
            console.warn(`⚠️  Failed to parse global style file ${stylePath}:`, (error as Error).message);
          }
        }
      }
    }

    return globalStyles;
  }
}
