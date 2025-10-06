/**
 * ng-parser - Advanced Angular parser with RAG/GraphRAG optimized output
 *
 * New architecture (v2):
 * - Core Angular parsing (built-in, non-extensible)
 * - Custom visitors (user-extensible)
 */

// === Main API ===
export { NgParser, type NgParseResult } from './core/ng-parser.js';

// === Custom Visitor API ===
export type {
  CustomVisitor,
  VisitorContext,
  VisitorWarning,
  VisitorError,
} from './visitors/base/custom-visitor.js';
export { BaseVisitor } from './visitors/base/custom-visitor.js';

// === Built-in Visitors ===
export {
  RxJSPatternVisitor,
  type RxJSPattern,
  type RxJSPatternResults,
} from './visitors/built-in/index.js';
export {
  SecurityVisitor,
  type SecurityPattern,
  type SecurityResults,
} from './visitors/built-in/index.js';
export {
  PerformanceVisitor,
  type PerformancePattern,
  type PerformanceResults,
} from './visitors/built-in/index.js';

// === Legacy API (for backward compatibility) ===
export { AngularParser } from './core/angular-parser.js';
export { VisitorRegistry } from './core/visitor-registry.js';
export { ComponentExtractor } from './extractors/component-extractor.js';
export { ServiceExtractor } from './extractors/service-extractor.js';
export { ModuleExtractor } from './extractors/module-extractor.js';

// === Formatters ===
export { MarkdownFormatter } from './formatters/markdown-formatter.js';
export { GraphRAGFormatter } from './formatters/graphrag-formatter.js';
export { SimpleJsonFormatter } from './formatters/simple-json-formatter.js';
export { HtmlFormatter } from './formatters/html-formatter.js';

// === Types ===
export * from './types/index.js';

// === Utils ===
export * from './utils/ast-helpers.js';
export * from './utils/file-helpers.js';
