# Getting Started with ng-parser

## Installation

### Global Installation (CLI)

```bash
npm install -g ng-parser
```

### Local Installation (API)

```bash
npm install ng-parser
# Install peer dependencies
npm install @angular/compiler @angular/compiler-cli @angular/core
```

## Quick Start

### Option 1: CLI (Recommended)

The CLI is the fastest way to parse an Angular project:

```bash
# Basic parsing (core only, fastest)
ng-parser parse ./src

# With visitors for pattern extraction
ng-parser parse ./src --visitors rxjs,security

# Export to file
ng-parser parse ./src -o analysis.json

# Export all formats
ng-parser parse ./src -f all -o ./output/my-project
```

**Output:**
```
🚀 ng-parser v1.0.0

📦 Parsing: ./src

✅ Parsed in 523ms

📊 Results:
   Components      12
   Services         8
   Modules          3
   Directives       5
   Pipes            2

   Total entities:       30
   Total relationships:  47

💡 Export results:
   ng-parser parse ./src -o output.json
```

See [CLI.md](./CLI.md) for complete CLI documentation.

### Option 2: Programmatic API

Use ng-parser in your Node.js/TypeScript code:

```typescript
import { NgParser } from 'ng-parser';

const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

console.log(`Entities: ${result.metadata.totalEntities}`);
console.log(`Relationships: ${result.metadata.totalRelationships}`);

// Access entities
for (const entity of result.entities.values()) {
  console.log(`[${entity.type}] ${entity.name}`);
}

// Export to different formats
const json = result.toJSON();
const markdown = result.toMarkdown();
const graph = result.toGraphRAG();
```

## Common Use Cases

### 1. Generate Documentation

```bash
# RAG-optimized markdown for LLMs
ng-parser parse ./src -f markdown -o architecture.md
```

### 2. Extract Security Patterns

```bash
# Find security-relevant patterns
ng-parser parse ./src --visitors security -o security-patterns.json
```

### 3. RxJS Analysis

```bash
# Find Observable usage and ngOnDestroy patterns
ng-parser parse ./src --visitors rxjs -o rxjs-report.json
```

### 4. Complete Analysis

```bash
# Full parse with all visitors and all formats
ng-parser parse ./src --all-visitors -f all -o ./reports/analysis
```

### 5. Knowledge Graph Export

```bash
# Export as JSON-LD for graph databases
ng-parser parse ./src -f graph -o knowledge-graph.json
```

## Export Formats

ng-parser supports multiple output formats:

| Format | CLI Flag | Description | Use Case |
|--------|----------|-------------|----------|
| **Full JSON** | `-f full` (default) | Complete data | Tools, analysis |
| **SimpleJSON** | `-f simple` | Entities only | Lightweight reports |
| **Markdown** | `-f markdown` | RAG-optimized | LLM consumption |
| **GraphRAG** | `-f graph` | JSON-LD knowledge graph | Graph databases |
| **All** | `-f all` | All formats at once | Complete export |

## Visitors (Pattern Extraction)

By default, ng-parser runs core parsing only (fastest). Enable visitors for pattern extraction:

### Available Visitors

| Visitor | Flag | Extracts |
|---------|------|----------|
| **RxJS** | `--visitors rxjs` | Observable usage, ngOnDestroy patterns |
| **Security** | `--visitors security` | innerHTML, eval, HTTP URLs, secrets |
| **Performance** | `--visitors performance` | Change detection, trackBy, functions in templates |
| **All** | `--all-visitors` | All built-in visitors |

### Examples

```bash
# Single visitor
ng-parser parse ./src --visitors rxjs

# Multiple visitors
ng-parser parse ./src --visitors rxjs,security

# All visitors
ng-parser parse ./src --all-visitors
```

## Next Steps

- **[CLI Documentation](./CLI.md)** - Complete CLI reference
- **[API Reference](./API_REFERENCE.md)** - Programmatic API documentation
- **[Examples](./examples/README.md)** - Code examples with sample app
- **[Architecture Guide](./ARCHITECTURE.md)** - Understanding the two-layer architecture
- **[Creating Custom Visitors](./API_REFERENCE.md#custom-visitors)** - Extend ng-parser

## Troubleshooting

### CLI not found

If `ng-parser` command is not found after global installation:

```bash
npm install -g ng-parser
# Or use npx
npx ng-parser parse ./src
```

### No entities found

Ensure you're pointing to an Angular source directory:

```bash
ng-parser parse ./src/app  # Point to Angular code
```

### Import errors in API

Make sure peer dependencies are installed:

```bash
npm install @angular/compiler @angular/compiler-cli @angular/core
```
