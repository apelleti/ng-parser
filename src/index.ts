/**
 * ng-parser - Advanced Angular parser with RAG/GraphRAG optimized output
 *
 * New architecture (v2):
 * - Core Angular parsing (built-in, non-extensible)
 * - Custom visitors (user-extensible)
 */

// === Main API ===
export { NgParser, type NgParseResult } from './core/ng-parser';

// === Custom Visitor API ===
export type {
  CustomVisitor,
  VisitorContext,
  VisitorWarning,
  VisitorError,
} from './visitors/base/custom-visitor';
export { BaseVisitor } from './visitors/base/custom-visitor';

// === Built-in Visitors ===
export {
  RxJSPatternVisitor,
  type RxJSPattern,
  type RxJSPatternResults,
} from './visitors/built-in';
export {
  SecurityVisitor,
  type SecurityPattern,
  type SecurityResults,
} from './visitors/built-in';
export {
  PerformanceVisitor,
  type PerformancePattern,
  type PerformanceResults,
} from './visitors/built-in';

// === Legacy API (for backward compatibility) ===
export { AngularParser } from './core/angular-parser';
export { VisitorRegistry } from './core/visitor-registry';
export { ComponentExtractor } from './extractors/component-extractor';
export { ServiceExtractor } from './extractors/service-extractor';
export { ModuleExtractor } from './extractors/module-extractor';

// === Formatters ===
export { MarkdownFormatter } from './formatters/markdown-formatter';
export { GraphRAGFormatter } from './formatters/graphrag-formatter';
export { SimpleJsonFormatter } from './formatters/simple-json-formatter';

// === Types ===
export * from './types';

// === Utils ===
export * from './utils/ast-helpers';
export * from './utils/file-helpers';
