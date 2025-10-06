# ng-parser CLI

Command-line interface for parsing Angular projects.

## Installation

```bash
npm install -g ng-parser
```

Or use with npx:

```bash
npx ng-parser parse ./src
```

## Usage

### Basic Parsing (No Visitors)

By default, ng-parser only runs core Angular parsing without any visitors (faster):

```bash
ng-parser parse <directory>
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

### Enable Visitors

Use `--visitors` to enable specific pattern extraction visitors:

```bash
# Enable specific visitors
ng-parser parse ./src --visitors rxjs,security

# Enable all built-in visitors
ng-parser parse ./src --all-visitors
```

**Available visitors:**
- `rxjs` - RxJS pattern extraction (Observable, Subject, ngOnDestroy)
- `security` - Security patterns (innerHTML, eval, HTTP URLs, secrets)
- `performance` - Performance patterns (change detection, trackBy, etc.)

**Output with visitors:**
```
📊 Results:
   [entities counts...]

🔌 Visitor Results:
   RxJS:         15 observables (3 without ngOnDestroy)
   Security:     2 patterns (innerHTML, eval)
   Performance:  8 patterns (change_detection_default, ngfor_without_trackby, ...)
```

## Export Formats

### JSON (Full)

Complete data export with all entities, relationships, and visitor results:

```bash
ng-parser parse ./src -o output.json
# or explicitly
ng-parser parse ./src -f full -o output.json
```

### SimpleJSON

Entities only (ng-analyzer compatible):

```bash
ng-parser parse ./src -f simple -o entities.json
```

### Markdown (RAG)

RAG-optimized markdown with YAML frontmatter:

```bash
ng-parser parse ./src -f markdown -o docs.md
```

### GraphRAG

Knowledge graph for graph databases (JSON-LD):

```bash
ng-parser parse ./src -f graph -o knowledge-graph.json
```

### HTML

Interactive visualization with D3.js dependency graph:

```bash
ng-parser parse ./src -f html -o analysis.html
```

**Features:**
- Interactive D3.js force-directed dependency graph
- Searchable entity explorer
- Visitor results dashboards (RxJS, Security, Performance)
- Clickable Git source URLs
- Self-contained (works offline)
- Responsive design

### All Formats

Export all formats at once with a common prefix:

```bash
ng-parser parse ./src -f all -o ./output/my-project
```

**Creates:**
- `my-project.full.json` - Complete data
- `my-project.simple.json` - Entities only
- `my-project.rag.md` - RAG-optimized markdown
- `my-project.graph.json` - Knowledge graph
- `my-project.html` - Interactive HTML visualization

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <file>` | Output file path | - |
| `-f, --format <format>` | Output format: `full`, `simple`, `markdown`, `graph`, `html`, `all` | `full` |
| `--visitors <list>` | Enable visitors (comma-separated: `rxjs,security,performance`) | none |
| `--all-visitors` | Enable all built-in visitors | false |
| `-v, --verbose` | Verbose output | false |
| `-h, --help` | Display help | - |
| `--version` | Display version | - |

## Examples

### 1. Quick Parse (Core Only)

```bash
ng-parser parse ./src
```

Fastest option - only Angular entities, no pattern extraction.

### 2. Parse with RxJS Analysis

```bash
ng-parser parse ./src --visitors rxjs -o rxjs-report.json
```

Extracts Observable usage patterns and ngOnDestroy lifecycle.

### 3. Security Audit Export

```bash
ng-parser parse ./src --visitors security -o security-patterns.json
```

Exports security-relevant patterns for auditing tools.

### 4. Complete Analysis

```bash
ng-parser parse ./src --all-visitors -f all -o ./reports/analysis
```

Full parse with all visitors, all export formats.

### 5. RAG Pipeline

```bash
ng-parser parse ./src -f markdown -o architecture.md
```

Generate RAG-optimized docs for LLM consumption.

### 6. Knowledge Graph

```bash
ng-parser parse ./src -f graph -o graph.json
```

Export as JSON-LD knowledge graph for Neo4j, etc.

### 7. Interactive HTML Visualization

```bash
ng-parser parse ./src --all-visitors -f html -o interactive-docs.html
```

Generate interactive HTML documentation with:
- D3.js dependency graph (zoom, pan, search)
- Visitor dashboards (RxJS, Security, Performance)
- Searchable entity tables
- Clickable Git source links

**Perfect for:**
- Team onboarding (visual learning)
- Architecture presentations (interactive demos)
- Code reviews (shareable offline)
- CI/CD documentation (auto-generated docs)

## Exit Codes

- `0` - Success
- `1` - Error (directory not found, parsing error, etc.)

## Performance Tips

1. **Use core parsing only** (no visitors) for fastest results
2. **Enable specific visitors** only when needed
3. **Use SimpleJSON format** for smallest output files
4. **Filter large projects** by parsing specific subdirectories

## Integration Examples

### CI/CD Pipeline

```bash
#!/bin/bash
# Generate architecture docs on every commit

ng-parser parse ./src -f markdown -o docs/architecture.md
git add docs/architecture.md
```

### Pre-commit Hook

```bash
#!/bin/bash
# Check for security patterns before commit

ng-parser parse ./src --visitors security -o /tmp/security.json
# Add your security analysis logic here
```

### Documentation Generation

```bash
# Generate multiple format docs
ng-parser parse ./src -f all -o ./docs/angular-analysis

# Creates:
#   angular-analysis.full.json
#   angular-analysis.simple.json
#   angular-analysis.rag.md
#   angular-analysis.graph.json
```

## Verbose Mode

Use `-v` or `--verbose` for detailed output and error messages:

```bash
ng-parser parse ./src -v
```

Shows:
- Detailed error stack traces
- Visitor registration details
- File-by-file parsing progress

## Local Development

After cloning the repo:

```bash
# Build CLI
npm run build:cli

# Test locally
node dist/bin/ng-parser.js parse ./examples/sample-angular-app/src

# Link globally
npm link
ng-parser parse ./src
```

## Troubleshooting

### "Directory not found"

Ensure the path exists and is correct:
```bash
ng-parser parse ./src  # relative path
ng-parser parse /absolute/path/to/src  # absolute path
```

### "No entities found"

Make sure you're pointing to an Angular source directory with components, services, etc.

### Slow parsing

- Reduce directory depth
- Parse specific subdirectories
- Disable visitors if not needed

## See Also

- [API Reference](./API_REFERENCE.md) - Programmatic API
- [Architecture Guide](./ARCHITECTURE.md) - Two-layer architecture
- [Examples](./examples/README.md) - Code examples
