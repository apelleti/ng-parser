# Changelog

All notable changes to ng-parser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-03

### 📝 Documentation

- Updated package name to `@ttwtf/ng-parser` in README.md
- Fixed all import examples to use the new scoped package name

### 🔧 Changes

- Changed package name from `ng-parser` to `@ttwtf/ng-parser`
- Updated repository URLs to apelleti/ng-parser

## [1.0.0] - 2025-10-03

### 🎉 Initial Release

ng-parser is an advanced Angular parser with RAG/GraphRAG optimized output and extensible visitor architecture.

### ✨ Features

#### CLI (Command-Line Interface)
- `ng-parser parse <directory>` - Core parsing only by default (fastest)
- `--visitors <list>` - Enable specific visitors (rxjs, security, performance)
- `--all-visitors` - Enable all built-in visitors
- `-o, --output <file>` - Export to file
- `-f, --format <format>` - Export formats: full, simple, markdown, graph, all
- Clean terminal output with entity counts and visitor results

#### Two-Layer Architecture
- **Layer 1: Core Angular Parsers (Built-in)**
  - ComponentParser - Standalone components, signals, inputs/outputs, lifecycle hooks
  - ServiceParser - Dependency injection, providedIn scopes
  - ModuleParser - Declarations, imports, exports, providers
  - DirectiveParser - Inputs, outputs, standalone directives
  - PipeParser - Pure/impure pipes, standalone support

- **Layer 2: Custom Visitors (Extensible)**
  - `BaseVisitor<TResult>` - Abstract base class for creating custom pattern extractors
  - Visitor lifecycle hooks: onBeforeParse, visitNode, visitEntity, onAfterParse
  - Built-in visitors: RxJSPatternVisitor, SecurityVisitor, PerformanceVisitor

#### Modern Angular Support
- ✅ Standalone components (Angular 14+)
- ✅ Signals API (Angular 16+)
- ✅ Modern dependency injection patterns
- ✅ Angular 18, 19, 20 compatibility

#### Export Formats
- **JSON** (`ng-parser.full.json`): Complete data export with all entities, relationships, and custom analysis
- **Markdown** (`ng-parser.rag.md`): RAG/LLM-optimized with YAML frontmatter and semantic chunking
- **GraphRAG** (`ng-parser.graph.json`): JSON-LD knowledge graph for graph databases
- **SimpleJSON** (`ng-parser.simple.json`): Simplified format compatible with ng-analyzer

#### Pattern Extraction
- **RxJSPatternVisitor**: Extracts Observable/Subject usage and lifecycle patterns
- **SecurityVisitor**: Identifies innerHTML, eval(), HTTP URLs, potential secrets
- **PerformanceVisitor**: Detects change detection, trackBy, function calls in templates

#### Core Capabilities
- TypeScript AST-based parsing using @angular/compiler-cli
- Entity relationship tracking (imports, injects, declares, exports, provides)
- Metrics collection system
- Non-throwing error model with warnings and errors
- Extensible visitor pattern for custom analysis

### 📚 Documentation
- CLI documentation (CLI.md)
- Comprehensive API reference (API_REFERENCE.md)
- Architecture guide (ARCHITECTURE.md)
- Getting started guide (GETTING_STARTED.md)
- Publishing guide (PUBLISHING.md)
- Complete examples with sample Angular app

### 🔄 CI/CD
- GitHub Actions workflow for CI (tests on Node.js 18, 20, 22)
- Automated NPM publishing on releases
- Code coverage with Codecov
- Issue and PR templates

### 🔧 Technical Details

**Supported Versions:**
- Node.js: ≥ 18.0.0
- TypeScript: ≥ 5.4.0
- Angular: 18.x, 19.x, 20.x (peer dependencies)

**Package Structure:**
- Zero runtime dependencies (except TypeScript)
- Peer dependencies for Angular packages (uses your project's version)
- Fully typed with TypeScript

### 📦 Installation

```bash
npm install @ttwtf/ng-parser
npm install @angular/compiler @angular/compiler-cli @angular/core
```



## Versioning Strategy

ng-parser follows [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)**: Breaking API changes
- **Minor (0.x.0)**: New features, backward compatible
- **Patch (0.0.x)**: Bug fixes, backward compatible

## Contributing

See [CODE_REVIEW.md](./CODE_REVIEW.md) for contribution guidelines.

## License

MIT © 2024
