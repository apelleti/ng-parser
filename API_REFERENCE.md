# API Reference

Complete API documentation for ng-parser.

> **Note**: For command-line usage, see [CLI Documentation](./CLI.md). This document covers the programmatic API only.

## Table of Contents

- [CLI vs API](#cli-vs-api)
- [NgParser](#ngparser)
- [NgParseResult](#ngparseresult)
- [Custom Visitors](#custom-visitors)
- [Built-in Visitors](#built-in-visitors)
- [Types](#types)
- [Formatters](#formatters)

---

## CLI vs API

ng-parser can be used in two ways:

### Command-Line Interface (Recommended for most users)

```bash
ng-parser parse ./src
ng-parser parse ./src --visitors rxjs -o output.json
```

See [CLI.md](./CLI.md) for complete CLI documentation.

### Programmatic API (For tool developers)

```typescript
import { NgParser } from 'ng-parser';
const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();
```

Continue reading for detailed API documentation.

---

## NgParser

Main parser class for analyzing Angular projects.

### Constructor

```typescript
new NgParser(options: NgParserOptions)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options | `NgParserOptions` | Yes | Configuration options |

**NgParserOptions:**

```typescript
interface NgParserOptions {
  rootDir: string;          // Root directory to parse
  includeTests?: boolean;   // Include test files (default: false)
  maxDepth?: number;        // Max directory depth (default: 20)
}
```

**Example:**

```typescript
import { NgParser } from 'ng-parser';

const parser = new NgParser({
  rootDir: './src',
  includeTests: false,
  maxDepth: 10,
});
```

### Methods

#### parse()

Parses the Angular project and returns the analysis result.

```typescript
async parse(): Promise<NgParseResult>
```

**Returns:** `Promise<NgParseResult>`

**Example:**

```typescript
const result = await parser.parse();
console.log(`Found ${result.metadata.totalEntities} entities`);
```

#### registerVisitor()

Registers a custom visitor to extract additional patterns.

```typescript
registerVisitor(visitor: CustomVisitor<any>): void
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| visitor | `CustomVisitor<any>` | Custom visitor instance |

**Example:**

```typescript
import { RxJSPatternVisitor } from 'ng-parser';

parser.registerVisitor(new RxJSPatternVisitor());
```

#### getVisitors()

Returns all registered visitors.

```typescript
getVisitors(): CustomVisitor<any>[]
```

**Returns:** Array of registered visitors

**Example:**

```typescript
const visitors = parser.getVisitors();
console.log(`Registered ${visitors.length} visitors`);
```

---

## NgParseResult

Result object returned by `NgParser.parse()`.

### Properties

```typescript
interface NgParseResult {
  entities: Map<string, Entity>;
  relationships: Relationship[];
  metadata: Metadata;
  warnings: VisitorWarning[];
  errors: VisitorError[];
  metrics: Map<string, number | string>;
  customAnalysis: Map<string, any>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `entities` | `Map<string, Entity>` | All parsed Angular entities (components, services, etc.) |
| `relationships` | `Relationship[]` | Relationships between entities (imports, injects, etc.) |
| `metadata` | `Metadata` | Project metadata (file count, entity count, timestamp) |
| `warnings` | `VisitorWarning[]` | Non-critical issues found during parsing |
| `errors` | `VisitorError[]` | Critical errors encountered during parsing |
| `metrics` | `Map<string, number \| string>` | Metrics collected by parsers and visitors |
| `customAnalysis` | `Map<string, any>` | Results from registered custom visitors |

### Methods

#### toJSON()

Exports the complete result as JSON.

```typescript
toJSON(): object
```

**Returns:** Complete parse result as JavaScript object

**Example:**

```typescript
const json = result.toJSON();
fs.writeFileSync('analysis.json', JSON.stringify(json, null, 2));
```

#### toSimpleJSON()

Exports a simplified JSON format (ng-analyzer compatible).

```typescript
toSimpleJSON(): object
```

**Returns:** Simplified JSON object

**Example:**

```typescript
const simple = result.toSimpleJSON();
fs.writeFileSync('simple.json', JSON.stringify(simple, null, 2));
```

---

## Custom Visitors

### BaseVisitor

Abstract base class for creating custom visitors.

```typescript
abstract class BaseVisitor<TResult> implements CustomVisitor<TResult>
```

**Type Parameters:**

| Parameter | Description |
|-----------|-------------|
| `TResult` | Type of the result object returned by `getResults()` |

### Required Properties

```typescript
abstract readonly name: string;          // Unique visitor name
abstract readonly description: string;   // Human-readable description
abstract readonly priority: number;      // Execution priority (lower = earlier)
abstract readonly version: string;       // Visitor version (semver)
```

### Lifecycle Methods

#### onBeforeParse()

Called once before parsing starts.

```typescript
onBeforeParse(context: VisitorContext): void
```

**Use cases:**
- Initialize state
- Setup caches
- Log start message

#### visitNode()

Called for each TypeScript AST node.

```typescript
async visitNode(node: ts.Node, context: VisitorContext): Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | `ts.Node` | TypeScript AST node |
| `context` | `VisitorContext` | Current parsing context |

**Use cases:**
- Extract patterns from AST
- Analyze syntax structures
- Track specific node types

#### visitEntity()

Called for each parsed Angular entity.

```typescript
async visitEntity(entity: Entity, context: VisitorContext): Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `Entity` | Parsed Angular entity |
| `context` | `VisitorContext` | Current parsing context |

**Use cases:**
- Extract patterns from entities
- Analyze entity relationships
- Count specific entity types

#### onAfterParse()

Called once after all files are parsed.

```typescript
onAfterParse(context: VisitorContext): void
```

**Use cases:**
- Finalize metrics
- Cleanup resources
- Log summary

#### getResults()

Returns the visitor's extracted data.

```typescript
abstract getResults(): TResult
```

**Returns:** Visitor-specific result object

#### reset()

Resets visitor state for reuse.

```typescript
reset(): void
```

**Important:** Always call `super.reset()` when overriding!

### Helper Methods

#### addMetric()

Adds a metric to the parse result.

```typescript
protected addMetric(context: VisitorContext, key: string, value: number | string): void
```

#### addWarning()

Adds a non-critical warning.

```typescript
protected addWarning(context: VisitorContext, code: string, message: string): void
```

#### addError()

Adds a critical error.

```typescript
protected addError(context: VisitorContext, code: string, message: string): void
```

### Example: Custom Visitor

```typescript
import { BaseVisitor, type VisitorContext, type Entity } from 'ng-parser';
import * as ts from 'typescript';

interface MyPattern {
  pattern: string;
  location: string;
}

interface MyResult {
  patterns: MyPattern[];
  total: number;
}

class MyVisitor extends BaseVisitor<MyResult> {
  readonly name = 'MyVisitor';
  readonly description = 'Extracts my custom patterns';
  readonly priority = 50;
  readonly version = '1.0.0';

  private patterns: MyPattern[] = [];

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (ts.isClassDeclaration(node)) {
      this.patterns.push({
        pattern: 'class',
        location: context.sourceFile.fileName,
      });
    }
  }

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    if (entity.type === 'component') {
      this.patterns.push({
        pattern: 'component',
        location: entity.filePath,
      });
    }
  }

  onAfterParse(context: VisitorContext): void {
    this.addMetric(context, 'my_pattern_count', this.patterns.length);
  }

  getResults(): MyResult {
    return {
      patterns: this.patterns,
      total: this.patterns.length,
    };
  }

  reset(): void {
    super.reset();
    this.patterns = [];
  }
}

// Usage
parser.registerVisitor(new MyVisitor());
const result = await parser.parse();
const myResults = result.customAnalysis.get('MyVisitor');
```

---

## Built-in Visitors

### RxJSPatternVisitor

Extracts RxJS observable usage patterns.

```typescript
import { RxJSPatternVisitor, type RxJSPatternResults } from 'ng-parser';

parser.registerVisitor(new RxJSPatternVisitor());
const result = await parser.parse();
const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor') as RxJSPatternResults;
```

**Result Type:**

```typescript
interface RxJSPatternResults {
  patterns: RxJSPattern[];
  totalObservables: number;
  observablesInComponents: number;
  componentsWithNgOnDestroy: string[];
  componentsWithoutNgOnDestroy: string[];
}

interface RxJSPattern {
  type: 'Observable' | 'Subject' | 'BehaviorSubject' | 'ReplaySubject';
  entityId: string;
  entityName: string;
  propertyName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  hasNgOnDestroy: boolean;
  isInComponent: boolean;
}
```

### SecurityVisitor

Extracts security-relevant patterns.

```typescript
import { SecurityVisitor, type SecurityResults } from 'ng-parser';

parser.registerVisitor(new SecurityVisitor());
const result = await parser.parse();
const securityResults = result.customAnalysis.get('SecurityVisitor') as SecurityResults;
```

**Result Type:**

```typescript
interface SecurityResults {
  patterns: SecurityPattern[];
  totalPatterns: number;
  byPattern: Record<string, number>;
}

interface SecurityPattern {
  pattern: 'innerHTML' | 'outerHTML' | 'bypassSecurityTrust' |
           'eval' | 'Function' | 'http_url' | 'potential_secret' |
           'xsrf_disabled';
  entityId: string;
  entityName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  context?: string;
}
```

### PerformanceVisitor

Extracts performance-relevant patterns.

```typescript
import { PerformanceVisitor, type PerformanceResults } from 'ng-parser';

parser.registerVisitor(new PerformanceVisitor());
const result = await parser.parse();
const perfResults = result.customAnalysis.get('PerformanceVisitor') as PerformanceResults;
```

**Result Type:**

```typescript
interface PerformanceResults {
  patterns: PerformancePattern[];
  totalPatterns: number;
  byPattern: Record<string, number>;
}

interface PerformancePattern {
  pattern: 'change_detection_default' | 'change_detection_onpush' |
           'ngfor_without_trackby' | 'ngfor_with_trackby' |
           'function_in_template' | 'http_in_constructor' |
           'loop_in_constructor' | 'large_library_import' |
           'array_chain' | 'indexof_in_loop' | 'storage_in_loop';
  entityId: string;
  entityName: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  context?: string;
}
```

---

## Types

### Entity

Represents a parsed Angular entity.

```typescript
interface Entity {
  id: string;
  type: 'component' | 'service' | 'module' | 'directive' | 'pipe';
  name: string;
  filePath: string;
  line: number;
  column: number;
  description?: string;
  metadata?: Record<string, any>;
}
```

### Relationship

Represents a relationship between entities.

```typescript
interface Relationship {
  type: 'imports' | 'exports' | 'declares' | 'provides' | 'injects' | 'uses' | 'usesInTemplate';
  from: string;  // Entity ID
  to: string;    // Entity ID
}
```

### Metadata

Project-level metadata.

```typescript
interface Metadata {
  totalFiles: number;
  totalEntities: number;
  totalRelationships: number;
  generatedAt: string;  // ISO 8601 timestamp
}
```

### VisitorContext

Context provided to visitor methods.

```typescript
interface VisitorContext {
  sourceFile: ts.SourceFile;
  rootDir: string;
  currentFile: string;
  entities: Map<string, Entity>;
  relationships: Relationship[];
  addMetric(key: string, value: number | string): void;
  addWarning(warning: VisitorWarning): void;
  addError(error: VisitorError): void;
}
```

### VisitorWarning

Non-critical issue reported by a visitor.

```typescript
interface VisitorWarning {
  visitor: string;
  code: string;
  message: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
}
```

### VisitorError

Critical error reported by a visitor.

```typescript
interface VisitorError {
  visitor: string;
  code: string;
  message: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
}
```

---

## Formatters

Formatters are used internally by `NgParseResult` methods but can also be used directly.

### SimpleJsonFormatter

```typescript
import { SimpleJsonFormatter } from 'ng-parser';

const formatter = new SimpleJsonFormatter();
const json = formatter.format(result);
```

### HtmlFormatter

```typescript
import { HtmlFormatter } from 'ng-parser';

const formatter = new HtmlFormatter();
const html = formatter.format(result);
```

---

## Utility Functions

### AST Helpers

```typescript
import { getDecorator, getDecoratorMetadata } from 'ng-parser';

// Get decorator by name
const componentDecorator = getDecorator(classNode, 'Component');

// Extract decorator metadata
const metadata = getDecoratorMetadata(componentDecorator);
```

### File Helpers

```typescript
import { findAngularFiles, isAngularFile } from 'ng-parser';

// Find all Angular files in directory
const files = await findAngularFiles('./src');

// Check if file is an Angular file
if (isAngularFile('./app.component.ts')) {
  // ...
}
```

---

## TypeScript Compatibility

ng-parser re-exports TypeScript types for visitor development:

```typescript
import type * as ts from 'typescript';

// Use TypeScript compiler API in custom visitors
if (ts.isClassDeclaration(node)) {
  // ...
}
```

---

## Version Support

| ng-parser | Angular | TypeScript | Node.js |
|-----------|---------|------------|---------|
| 2.x       | 18-20   | ≥ 5.4      | ≥ 18    |
| 1.x       | 15-17   | ≥ 4.9      | ≥ 16    |

---

## Error Handling

ng-parser uses a non-throwing error model:

```typescript
const result = await parser.parse();

// Check for errors
if (result.errors.length > 0) {
  console.error('Parsing errors:', result.errors);
}

// Check for warnings
if (result.warnings.length > 0) {
  console.warn('Parsing warnings:', result.warnings);
}

// Even with errors, partial results are available
console.log(`Parsed ${result.entities.size} entities`);
```

---

## Examples

See the [examples/](./examples/) directory for complete working examples:

- **01-quick-start.ts** - Basic usage with built-in visitors
- **02-custom-visitors.ts** - Creating custom visitors
- **03-complete-analysis.ts** - Complete workflow with all features
