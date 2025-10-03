# ng-parser

Advanced Angular parser with RAG/GraphRAG optimized output and extensible visitor architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Deep Angular Analysis** - Components, Services, Modules, Directives, Pipes
- 🧩 **Two-Layer Architecture** - Core parsing + Extensible custom visitors
- 🎯 **Modern Angular Support** - Standalone components, Signals (Angular 18-20)
- 📊 **Knowledge Graph** - Entities, relationships, hierarchical clustering
- 🤖 **RAG Optimized** - Markdown & JSON-LD outputs for LLM consumption
- ⚡ **Maintainable** - Built on official @angular/compiler-cli
- 🔌 **Extensible** - Create custom visitors for your analysis needs
- 🛡️ **Built-in Visitors** - RxJS patterns, Security, Performance analysis

## Installation

```bash
npm install @ttwtf/ng-parser
```

**Peer Dependencies** (automatically uses your project's Angular version):
```bash
npm install @angular/compiler @angular/compiler-cli @angular/core
```

**Supported versions**: Angular 18.x, 19.x, 20.x

## Quick Start

### CLI (Recommended)

```bash
# Parse an Angular project (core parsing only, fastest)
ng-parser parse ./src

# Enable specific visitors
ng-parser parse ./src --visitors rxjs,security

# Export to file
ng-parser parse ./src -o analysis.json

# Export all formats
ng-parser parse ./src -f all -o ./output/my-project
```

See [CLI Documentation](./CLI.md) for complete CLI reference.

### Programmatic API

```typescript
import { NgParser } from '@ttwtf/ng-parser';

const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

console.log(`Found ${result.metadata.totalEntities} Angular entities`);
console.log(`Found ${result.metadata.totalRelationships} relationships`);

// Access parsed entities
for (const entity of result.entities.values()) {
  console.log(`[${entity.type}] ${entity.name}`);
}
```

### With Built-in Visitors

```typescript
import {
  NgParser,
  RxJSPatternVisitor,
  SecurityVisitor,
  PerformanceVisitor
} from '@ttwtf/ng-parser';

const parser = new NgParser({ rootDir: './src' });

// Register pattern extraction visitors
parser.registerVisitor(new RxJSPatternVisitor());
parser.registerVisitor(new SecurityVisitor());
parser.registerVisitor(new PerformanceVisitor());

const result = await parser.parse();

// Access visitor results (raw patterns, not evaluations)
const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor');
console.log(`RxJS observables found: ${rxjsResults.totalObservables}`);
console.log(`In components: ${rxjsResults.observablesInComponents}`);

const securityResults = result.customAnalysis.get('SecurityVisitor');
console.log(`Security patterns found: ${securityResults.totalPatterns}`);
console.log(`By pattern:`, securityResults.byPattern);
```

### Export to Multiple Formats

```typescript
// JSON export (complete data)
const json = result.toJSON();

// Markdown export (RAG-optimized)
const markdown = result.toMarkdown();

// GraphRAG export (JSON-LD knowledge graph)
const graphRAG = result.toGraphRAG();

// SimpleJSON export (ng-analyzer compatible)
const simple = result.toSimpleJSON();
```

## Two-Layer Architecture

ng-parser uses a **strict two-layer separation** between parsing and analysis:

### Layer 1: Core Angular Parsers (Built-in, Non-Extensible)

**Pure extraction** of Angular concepts with guaranteed quality:

- ✅ **ComponentParser** - Standalone, signals, inputs/outputs, lifecycle
- ✅ **ServiceParser** - Dependency injection, providedIn
- ✅ **ModuleParser** - Declarations, imports, exports, providers
- ✅ **DirectiveParser** - Inputs, outputs, standalone
- ✅ **PipeParser** - Pure/impure, standalone

**Role:** Transform source code → structured data (AST, entities, relationships)

### Layer 2: Custom Visitors (Extensible, User-Defined)

**Pattern extraction** from parsed entities - NO evaluation or recommendations:

- **RxJSPatternVisitor** - Extracts Observable/Subject usage and lifecycle hooks
- **SecurityVisitor** - Extracts innerHTML, eval(), HTTP URLs, potential secrets
- **PerformanceVisitor** - Extracts change detection, trackBy, imports, constructors

**Role:** Extract additional patterns → structured facts (no judgments)

> **Important:** Visitors perform **extraction only**. They don't evaluate severity, don't recommend fixes, and don't judge code quality. They simply identify and categorize patterns. Analysis/evaluation tools can be built on top of the extracted data.

**Create your own visitors** to extract domain-specific patterns!

## Built-in Visitors

### RxJSPatternVisitor

Extracts RxJS usage patterns:

```typescript
const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor');

console.log(`Total observables: ${rxjsResults.totalObservables}`);
console.log(`In components: ${rxjsResults.observablesInComponents}`);
console.log(`Components with ngOnDestroy:`, rxjsResults.componentsWithNgOnDestroy);
console.log(`Components without ngOnDestroy:`, rxjsResults.componentsWithoutNgOnDestroy);

// Access individual patterns
rxjsResults.patterns.forEach(pattern => {
  console.log(`${pattern.type} in ${pattern.entityName} - has ngOnDestroy: ${pattern.hasNgOnDestroy}`);
});
```

**Extracts:**
- Observable/Subject/BehaviorSubject/ReplaySubject properties
- Component lifecycle (presence of ngOnDestroy)
- Location of each pattern

### SecurityVisitor

Extracts security-relevant patterns:

```typescript
const securityResults = result.customAnalysis.get('SecurityVisitor');

console.log(`Total patterns: ${securityResults.totalPatterns}`);
console.log(`By pattern:`, securityResults.byPattern);

// Example output: { innerHTML: 3, eval: 1, potential_secret: 2, http_url: 5 }
```

**Extracts:**
- innerHTML/outerHTML usage
- bypassSecurityTrust* calls
- eval() and Function() usage
- HTTP URLs (non-HTTPS)
- Potential hardcoded secrets (API keys, passwords, tokens)
- XSRF protection configuration

### PerformanceVisitor

Extracts performance-relevant patterns:

```typescript
const perfResults = result.customAnalysis.get('PerformanceVisitor');

console.log(`Total patterns: ${perfResults.totalPatterns}`);
console.log(`By pattern:`, perfResults.byPattern);

// Example output:
// {
//   change_detection_default: 15,
//   ngfor_without_trackby: 8,
//   function_in_template: 3
// }
```

**Extracts:**
- Change detection strategy (Default/OnPush)
- *ngFor with/without trackBy
- Function calls in templates
- HTTP calls in constructors
- Loops in constructors
- Large library imports (lodash, moment, rxjs)
- Array operation chains
- Storage operations in loops

## Creating Custom Visitors

Extend ng-parser with your own pattern extraction:

```typescript
import { BaseVisitor, type VisitorContext, type Entity } from '@ttwtf/ng-parser';
import * as ts from 'typescript';

interface MyPattern {
  pattern: 'my_pattern_type';
  entityName: string;
  location: any;
}

interface MyResult {
  patterns: MyPattern[];
  totalPatterns: number;
}

class MyCustomVisitor extends BaseVisitor<MyResult> {
  readonly name = 'MyCustomVisitor';
  readonly description = 'Extracts custom patterns';
  readonly priority = 50;
  readonly version = '1.0.0';

  private patterns: MyPattern[] = [];

  // Visit TypeScript AST nodes to extract patterns
  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (ts.isClassDeclaration(node)) {
      // Extract pattern - NO evaluation
      this.patterns.push({
        pattern: 'my_pattern_type',
        entityName: node.name?.getText() || 'unknown',
        location: { /* ... */ }
      });
    }
  }

  // Visit Angular entities to extract patterns
  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    if (entity.type === 'component') {
      // Extract fact about component
      const hasTemplate = !!entity.template;
      // Store the FACT, don't evaluate if it's good/bad
    }
  }

  getResults(): MyResult {
    return {
      patterns: this.patterns,
      totalPatterns: this.patterns.length
    };
  }

  reset(): void {
    super.reset();
    this.patterns = [];
  }
}

// Use it
parser.registerVisitor(new MyCustomVisitor());
```

**Remember:** Visitors should **extract patterns**, not evaluate them. Leave analysis and recommendations to separate tools that consume the extracted data.

## Export Formats

### JSON Export

Complete data export with all information:

```typescript
const json = result.toJSON();
```

**Contains:** All entities, relationships, metadata, custom analysis, warnings, errors, metrics

### Markdown Export

RAG/LLM-optimized documentation:

```typescript
const markdown = result.toMarkdown();
```

**Features:** YAML frontmatter, hierarchical structure, semantic chunking, 15% more token-efficient than JSON

### GraphRAG Export

Knowledge graph for graph databases:

```typescript
const graphRAG = result.toGraphRAG();
```

**Format:** JSON-LD with schema.org vocabulary, entities as nodes, relationships as edges

### SimpleJSON Export

ng-analyzer compatible format:

```typescript
const simple = result.toSimpleJSON();
```

## Examples

Complete working examples in `examples/`:

| Example | Description |
|---------|-------------|
| **01-quick-start.ts** | Basic parsing with built-in visitors |
| **02-custom-visitors.ts** | Creating custom analysis visitors |
| **03-complete-analysis.ts** | Complete workflow with all features |

Run examples:

```bash
# Quick start
npx ts-node examples/01-quick-start.ts

# Custom visitors
npx ts-node examples/02-custom-visitors.ts

# Complete analysis
npx ts-node examples/03-complete-analysis.ts
```

## Configuration

```typescript
const parser = new NgParser({
  rootDir: './src',              // Required: source directory
  includeTests: false,           // Optional: include test files
  maxDepth: 20,                  // Optional: directory depth limit
});
```

## Use Cases

- 🤖 **RAG/LLM Training** - Generate structured documentation for AI models
- 📊 **Code Analysis Foundations** - Extract patterns for analysis tools to evaluate
- 🔍 **Codebase Exploration** - Understand large Angular projects structure
- 🔒 **Security Pattern Detection** - Identify security-relevant code for auditing tools
- ⚡ **Performance Pattern Detection** - Extract patterns for performance analysis
- 📝 **Documentation** - Auto-generate architecture docs from parsed entities
- 🔄 **Migration Analysis** - Extract patterns to prepare for Angular upgrades
- 🏗️ **Analysis Tool Development** - Build custom analyzers on top of extracted data

## Requirements

- **Node.js** ≥ 18.0.0
- **TypeScript** ≥ 5.4.0
- **Angular** ≥ 18.0.0 (peer dependency)

## Documentation

- **[CLI Documentation](./CLI.md)** - Command-line interface reference
- **[Getting Started Guide](./GETTING_STARTED.md)** - Step-by-step tutorial
- **[Examples](./examples/README.md)** - Complete examples with sample app
- **[Architecture Guide](./ARCHITECTURE.md)** - Two-layer architecture explained
- **[Code Review Standards](./CODE_REVIEW.md)** - Quality standards
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Changelog](./CHANGELOG.md)** - Version history

## Version Strategy

ng-parser uses **peerDependencies** to support multiple Angular versions with a single codebase:

- ✅ Your project's Angular version is automatically used
- ✅ No version conflicts
- ✅ Supports Angular 18, 19, and 20
- ✅ Minimal maintenance overhead

## FAQ

**Q: Can I analyze a specific file instead of the whole project?**
Currently ng-parser works at the project level. For single-file analysis, use TypeScript Compiler API directly.

**Q: What if I only want specific visitors?**
Only register the visitors you need:
```typescript
parser.registerVisitor(new SecurityVisitor()); // Only security analysis
```

**Q: How do I access specific entity types?**
```typescript
const components = Array.from(result.entities.values())
  .filter(e => e.type === 'component');
```

**Q: Can I use this in a CI/CD pipeline?**
Yes! ng-parser works great in automated workflows for code quality checks.

## Contributing

Contributions welcome! Please read our [Code Review Standards](./CODE_REVIEW.md) before submitting PRs.

## License

MIT © [Your Name]

## Support

- 📖 [Full Documentation](./examples/README.md)
- 🐛 [Report Issues](https://github.com/your-repo/ng-parser/issues)
- 💬 [Discussions](https://github.com/your-repo/ng-parser/discussions)

---

**Made with ❤️ for the Angular community**
