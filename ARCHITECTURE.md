# ng-parser Architecture

## Overview

ng-parser uses a **strict two-layer architecture** that separates parsing from analysis. This design ensures maintainability, extensibility, and clear separation of concerns.

```
┌─────────────────────────────────────────────────────────┐
│                    ng-parser Core                        │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Core Angular Parsers (Built-in)               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • ComponentParser                               │    │
│  │ • ServiceParser                                 │    │
│  │ • ModuleParser                                  │    │
│  │ • DirectiveParser                               │    │
│  │ • PipeParser                                    │    │
│  └─────────────────────────────────────────────────┘    │
│                         ↓                                │
│            Entities + Relationships                      │
│                         ↓                                │
│  Layer 2: Custom Visitors (Extensible)                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Built-in Visitors:                              │    │
│  │ • RxJSPatternVisitor                            │    │
│  │ • SecurityVisitor                               │    │
│  │ • PerformanceVisitor                            │    │
│  │                                                 │    │
│  │ User-defined Visitors:                          │    │
│  │ • YourCustomVisitor                             │    │
│  │ • ...                                           │    │
│  └─────────────────────────────────────────────────┘    │
│                         ↓                                │
│              Custom Pattern Data                         │
└─────────────────────────────────────────────────────────┘
                          ↓
              Export Formats (JSON, MD, GraphRAG)
```

## Layer 1: Core Angular Parsers

### Responsibility
**Pure extraction** of Angular architectural concepts from TypeScript source code.

### Characteristics
- **Non-extensible**: Built into ng-parser, cannot be modified by users
- **Guaranteed quality**: Thoroughly tested, maintained by core team
- **Framework-specific**: Deep knowledge of Angular decorators, metadata, and patterns
- **AST-based**: Uses TypeScript Compiler API and Angular compiler

### Parsers

#### ComponentParser
Extracts Angular components:
- Decorator metadata (`@Component`)
- Selector, template, styles
- Standalone flag
- Inputs/Outputs
- Lifecycle hooks (ngOnInit, ngOnDestroy, etc.)
- Signals (signal, computed, effect)
- Dependencies (constructor injection)

#### ServiceParser
Extracts Angular services:
- Decorator metadata (`@Injectable`)
- `providedIn` scope (root, any, platform, or module)
- Dependencies (constructor injection)

#### ModuleParser
Extracts Angular modules:
- Decorator metadata (`@NgModule`)
- Declarations
- Imports
- Exports
- Providers
- Bootstrap components

#### DirectiveParser
Extracts Angular directives:
- Decorator metadata (`@Directive`)
- Selector
- Inputs/Outputs
- Standalone flag
- Host bindings/listeners

#### PipeParser
Extracts Angular pipes:
- Decorator metadata (`@Pipe`)
- Pipe name
- Pure/impure flag
- Standalone flag

### Output
Core parsers produce:
- **Entities**: Structured data representing Angular constructs
- **Relationships**: Dependencies, imports, declarations, etc.
- **Metadata**: File paths, line numbers, project statistics

## Layer 2: Custom Visitors

### Responsibility
**Pattern extraction** from parsed entities and TypeScript AST nodes.

### Characteristics
- **Extensible**: Users can create custom visitors
- **Extraction-only**: No evaluation, no severity assessment, no recommendations
- **Optional**: Only registered visitors are executed
- **Composable**: Multiple visitors can run on the same codebase

### Built-in Visitors

#### RxJSPatternVisitor
Extracts RxJS usage patterns:
- Observable/Subject/BehaviorSubject/ReplaySubject properties
- Component lifecycle (ngOnDestroy presence)
- Location of observables (component vs service)

**Does NOT**: Judge if subscriptions are "memory leaks" or recommend fixes

#### SecurityVisitor
Extracts security-relevant patterns:
- innerHTML/outerHTML usage
- bypassSecurityTrust* calls
- eval() and Function() usage
- HTTP URLs (non-HTTPS)
- Potential hardcoded secrets
- XSRF configuration

**Does NOT**: Assign severity levels or recommend security fixes

#### PerformanceVisitor
Extracts performance-relevant patterns:
- Change detection strategy
- *ngFor with/without trackBy
- Function calls in templates
- HTTP calls in constructors
- Large library imports
- Array operation chains

**Does NOT**: Evaluate performance impact or suggest optimizations

### Creating Custom Visitors

Users extend `BaseVisitor<TResult>` to create custom pattern extractors:

```typescript
class MyVisitor extends BaseVisitor<MyResult> {
  readonly name = 'MyVisitor';
  readonly description = 'Extracts my custom patterns';
  readonly priority = 50;
  readonly version = '1.0.0';

  // Visit TypeScript AST nodes
  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    // Extract patterns from AST
  }

  // Visit Angular entities
  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    // Extract patterns from parsed entities
  }

  getResults(): MyResult {
    return { /* extracted data */ };
  }
}
```

## Separation of Concerns

### What ng-parser DOES
✅ Parse Angular code → Structured entities
✅ Extract patterns → Factual data
✅ Provide raw data for analysis

### What ng-parser DOES NOT DO
❌ Evaluate code quality
❌ Assign severity levels
❌ Recommend fixes or improvements
❌ Make judgments about "good" or "bad" code

### Why This Separation?
1. **Clarity**: Parsing is objective, evaluation is subjective
2. **Flexibility**: Different teams have different standards
3. **Reusability**: Raw data can be analyzed in multiple ways
4. **Maintainability**: Parsing logic doesn't change with coding standards

## Data Flow

```
Source Code (.ts files)
        ↓
TypeScript Compiler API (AST)
        ↓
Layer 1: Core Parsers
        ↓
Entities + Relationships
        ↓
Layer 2: Custom Visitors
        ↓
Pattern Data
        ↓
Export Formats (JSON, Markdown, GraphRAG)
        ↓
Analysis Tools (external)
```

## Extensibility Points

### 1. Custom Visitors (Recommended)
Create visitors to extract domain-specific patterns:
- Business logic patterns
- Framework migration patterns
- Custom coding standards
- Architecture patterns

### 2. Export Formats
Consume parser output in different formats:
- **JSON**: Complete data for tools
- **Markdown**: Human-readable, RAG-optimized
- **GraphRAG**: Knowledge graph for graph databases
- **SimpleJSON**: Backward compatibility

### 3. Post-Processing
Build analysis tools on top of extracted data:
- Code quality metrics
- Migration readiness assessment
- Security auditing
- Performance profiling

## Design Principles

1. **Single Responsibility**: Each parser/visitor does one thing well
2. **Open/Closed**: Open for extension (visitors), closed for modification (core)
3. **Dependency Inversion**: Core depends on abstractions, not implementations
4. **Separation of Concerns**: Parsing ≠ Analysis
5. **Explicit over Implicit**: Clear APIs, no magic

## Performance Considerations

- **Lazy parsing**: Only parse files that match Angular patterns
- **Parallel visitors**: Visitors run independently
- **Incremental results**: Stream entities as they're discovered
- **AST caching**: TypeScript AST is reused across visitors

## Testing Strategy

### Core Parsers
- Unit tests with real Angular code samples
- Integration tests with full Angular projects
- Regression tests for edge cases

### Visitors
- Unit tests for pattern extraction
- Mock entities for isolated testing
- Integration tests with real codebases

## Future Architecture

Potential extensions (not yet implemented):

- **Incremental parsing**: Only re-parse changed files
- **Watch mode**: Continuous parsing during development
- **Multi-project support**: Parse multiple Angular projects
- **Plugin system**: Load visitors from npm packages
