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
  styles?: string[];
  styleUrls?: string[];
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
