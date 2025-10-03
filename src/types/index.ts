/**
 * Core types for ng-parser
 */

import type * as ts from 'typescript';

/**
 * Source location information
 */
export interface SourceLocation {
  filePath: string;
  start: number;
  end: number;
  line: number;
  column: number;
  sourceUrl?: string;  // URL to source file in GitHub/GitLab/Bitbucket/Azure
}

/**
 * Base interface for all extracted entities
 */
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  location: SourceLocation;
  documentation?: string;
  decorators?: DecoratorMetadata[];
  modifiers?: string[];
}

/**
 * Types of entities we can extract
 */
export enum EntityType {
  Component = 'component',
  Service = 'service',
  Module = 'module',
  Directive = 'directive',
  Pipe = 'pipe',
  Injectable = 'injectable',
  Interface = 'interface',
  Class = 'class',
  Function = 'function',
  Constant = 'constant',
  Route = 'route',
}

/**
 * Decorator metadata
 */
export interface DecoratorMetadata {
  name: string;
  arguments: Record<string, any>;
  location: SourceLocation;
}

/**
 * Component-specific metadata
 */
export interface ComponentEntity extends Entity {
  type: EntityType.Component;
  selector?: string;
  template?: string;
  templateUrl?: string;
  templateLocation?: TemplateLocation;
  templateAnalysis?: TemplateAnalysis;
  styles?: string[];
  styleUrls?: string[];
  styleLocations?: StyleLocation[];
  styleAnalysis?: StyleAnalysis;
  inputs?: InputMetadata[];
  outputs?: OutputMetadata[];
  providers?: string[];
  viewProviders?: string[];
  standalone?: boolean;
  imports?: string[];
  exports?: string[];
  changeDetection?: 'Default' | 'OnPush';
  encapsulation?: 'Emulated' | 'None' | 'ShadowDom';
  lifecycle?: string[];
  signals?: SignalMetadata[];
}

/**
 * Service/Injectable metadata
 */
export interface ServiceEntity extends Entity {
  type: EntityType.Service | EntityType.Injectable;
  providedIn?: string;
  dependencies?: DependencyMetadata[];
}

/**
 * Module metadata
 */
export interface ModuleEntity extends Entity {
  type: EntityType.Module;
  declarations?: string[];
  imports?: string[];
  exports?: string[];
  providers?: string[];
  bootstrap?: string[];
}

/**
 * Directive metadata
 */
export interface DirectiveEntity extends Entity {
  type: EntityType.Directive;
  selector?: string;
  inputs?: InputMetadata[];
  outputs?: OutputMetadata[];
  standalone?: boolean;
  providers?: string[];
}

/**
 * Pipe metadata
 */
export interface PipeEntity extends Entity {
  type: EntityType.Pipe;
  pipeName: string;
  pure?: boolean;
  standalone?: boolean;
}

/**
 * Input metadata (supports both decorator and signal-based)
 */
export interface InputMetadata {
  name: string;
  propertyName: string;
  type?: string;
  required?: boolean;
  isSignal?: boolean;
  defaultValue?: any;
  alias?: string;
}

/**
 * Output metadata (supports both decorator and signal-based)
 */
export interface OutputMetadata {
  name: string;
  propertyName: string;
  type?: string;
  isSignal?: boolean;
  alias?: string;
}

/**
 * Signal metadata (Angular 19+)
 */
export interface SignalMetadata {
  name: string;
  signalType: 'signal' | 'computed' | 'input' | 'output' | 'model' | 'viewChild' | 'contentChild';
  type?: string;
  initialValue?: any;
}

/**
 * Dependency injection metadata
 */
export interface DependencyMetadata {
  name: string;
  type: string;
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  host?: boolean;
}

/**
 * Relationship between entities
 */
export interface Relationship {
  id: string;
  type: RelationType;
  source: string; // Entity ID
  target: string; // Entity ID
  metadata?: Record<string, any>;
}

/**
 * Types of relationships
 */
export enum RelationType {
  Imports = 'imports',
  Exports = 'exports',
  Declares = 'declares',
  Provides = 'provides',
  Injects = 'injects',
  Extends = 'extends',
  Implements = 'implements',
  Uses = 'uses',
  Routes = 'routes',
  LazyLoads = 'lazy_loads',
}

/**
 * Knowledge Graph structure
 */
export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relationships: Relationship[];
  hierarchy: HierarchyNode;
  metadata: GraphMetadata;
}

/**
 * Hierarchical structure for clustering
 */
export interface HierarchyNode {
  id: string;
  name: string;
  type: 'app' | 'feature' | 'module' | 'component';
  children: HierarchyNode[];
  entities: string[]; // Entity IDs
}

/**
 * Graph metadata
 */
export interface GraphMetadata {
  projectName?: string;
  angularVersion?: string;
  totalEntities: number;
  totalRelationships: number;
  timestamp: string;
  patterns?: PatternDetection[];
}

/**
 * Detected patterns
 */
export interface PatternDetection {
  type: string;
  description: string;
  entities: string[];
  confidence: number;
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  rootDir: string;
  tsConfigPath?: string;
  includeTests?: boolean;
  includeNodeModules?: boolean;
  extractTemplates?: boolean;
  extractStyles?: boolean;
  detectPatterns?: boolean;
  maxDepth?: number;
  strictMode?: boolean; // Throw on entity ID collisions
  git?: {
    enabled?: boolean; // Default: true
    branch?: string;   // Auto-detected if not specified
  };
}

/**
 * Visitor interface for extensibility
 */
export interface Visitor {
  name: string;
  priority: number;
  visitNode(node: ts.Node, context: VisitorContext): void | Promise<void>;
  getResults(): any;
}

/**
 * Context passed to visitors
 */
export interface VisitorContext {
  sourceFile: ts.SourceFile;
  typeChecker: ts.TypeChecker;
  program: ts.Program;
  entities: Map<string, Entity>;
  relationships: Relationship[];
  rootDir?: string;
  addEntity(entity: Entity): void;
  addRelationship(relationship: Relationship): void;
}

/**
 * Parse result
 */
export interface ParseResult {
  graph: KnowledgeGraph;
  toMarkdown(): string;
  toJSON(): any;
  toGraphRAG(): any;
  toSimpleJSON(): any;
  getGraph(): KnowledgeGraph;
  getEntities(): Map<string, Entity>;
  getRelationships(): Relationship[];
  getMetadata(): GraphMetadata;
}

/**
 * Template location (for external templates)
 */
export interface TemplateLocation {
  filePath: string;     // Relative to rootDir
  sourceUrl?: string;   // URL to template file in Git
  exists: boolean;      // File exists on disk
}

/**
 * Template analysis result
 */
export interface TemplateAnalysis {
  usedComponents: string[];      // Component selectors found in template
  usedDirectives: string[];      // Directives used (ngIf, ngFor, etc.)
  usedPipes: string[];           // Pipes used in template
  bindings: BindingMetadata[];   // Property/event bindings
  templateRefs: string[];        // Template references (#ref)
  complexity?: number;           // Template complexity score
}

/**
 * Binding metadata in templates
 */
export interface BindingMetadata {
  type: 'property' | 'event' | 'twoWay' | 'attribute' | 'class' | 'style';
  name: string;
  expression?: string;
  line: number;
}

/**
 * Style file location
 */
export interface StyleLocation {
  originalPath: string;   // Original path from component
  filePath: string;       // Resolved path relative to rootDir
  sourceUrl?: string;     // URL to style file in Git
  exists: boolean;        // File exists on disk
}

/**
 * Style analysis result
 */
export interface StyleAnalysis {
  files: StyleFileMetadata[];
}

/**
 * Style file metadata
 */
export interface StyleFileMetadata {
  filePath: string;                  // Relative to rootDir
  sourceUrl?: string;                // URL to file in Git
  imports: ScssImportMetadata[];     // @import statements
  uses: ScssUseMetadata[];           // @use statements
}

/**
 * SCSS @import metadata
 */
export interface ScssImportMetadata {
  path: string;          // Import path: 'theme/colors'
  statement: string;     // Full statement: '@import "theme/colors"'
  resolvedPath?: string; // Resolved absolute path if found
  line: number;          // Line number in file
}

/**
 * SCSS @use metadata
 */
export interface ScssUseMetadata {
  path: string;          // Use path: 'sass:math'
  statement: string;     // Full statement: '@use "sass:math" as m'
  namespace?: string;    // Namespace: 'm' or '*' or undefined
  resolvedPath?: string; // Resolved absolute path if found
  line: number;          // Line number in file
}
