# Changelog

All notable changes to ng-parser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.2] - 2025-10-06

### 🔧 Technical Changes

- **Build improvements**: Rebuilt project to ensure all formatters are properly compiled
- **HTML formatter**: Verified HTML export functionality with `--format all` option
- All export formats (JSON, SimpleJSON, Markdown, GraphRAG, HTML) working correctly

### ✅ Validation

- ✅ HTML export working in `--format all` mode
- ✅ All 5 export formats generated successfully
- ✅ Build artifacts up to date

## [1.4.1] - 2025-10-06

### 🐛 Bug Fixes

- **Fixed Jest test suite configuration**
  - Tests were failing with `SyntaxError: Unexpected token 'export'` in setup.ts
  - Root cause: TypeScript adding `export {}` to setup file with `isolatedModules: true`
  - Solution: Added `isolatedModules: false` to ts-jest configuration
  - All 134 tests now passing successfully

### 🔧 Technical Changes

- **jest.config.mjs**: Added explicit tsconfig override with `isolatedModules: false`
- Prevents TypeScript from automatically adding `export {}` to non-module files
- Maintains ESM compatibility while fixing setup file transformation

### ✅ Validation

- ✅ All 8 test suites passing
- ✅ All 134 tests passing
- ✅ No test configuration errors

## [1.4.0] - 2025-10-03

### 🐛 Bug Fixes

- **Fixed `styleUrl` (singular) support**
  - Angular 15.1+ supports both `styleUrl` (string) and `styleUrls` (array)
  - Previously only `styleUrls` (plural) was parsed, missing 75+ components in Angular Material
  - Added `extractStyleUrls()` method to merge both formats
  - All components using `styleUrl` now have complete style metadata

- **Fixed `.css` → `.scss` normalization (Angular Material pattern)**
  - Angular Material components declare `styleUrl: 'file.css'` but actual file is `file.scss`
  - Parser now auto-detects and normalizes extension if `.scss` exists and `.css` doesn't
  - Component entities now show correct `styleUrls: ["file.scss"]` instead of non-existent `.css`
  - All style files now correctly marked as `exists: true`

- **Fixed broken file paths with "../" (219 occurrences)**
  - File paths like `"../cdk/layout/layout.ts"` now properly resolved
  - Root cause: `path.relative()` created "../" when files outside parsing directory
  - Solution: All paths now relative to Git repository root instead of parsing directory
  - Impact: Entity IDs (276), relationships (355), decorator locations all fixed

- **Fixed broken source URLs (372 occurrences)**
  - URLs like `https://github.com/.../blob/main/../cdk/file.ts` now correct
  - Root cause: `generateSourceUrl()` expected absolute path but received relative path
  - Solution: `enrichEntities()` now reconstructs absolute paths before URL generation
  - All GitHub/GitLab/Bitbucket links now valid

- **Fixed missing source URLs on entities**
  - All entities now have `sourceUrl` populated (was `undefined`)
  - Root cause: `enrichEntities()` created new parser instance without gitInfo
  - Solution: Pass `gitInfo` parameter to `enrichEntities()`

- **Fixed duplicate paths in style sourceUrls**
  - Style URLs had duplicate path segments: `blob/main/src/material/src/material/file.scss`
  - Root cause: `generateStyleLocation()` used parsing rootDir instead of git rootDir
  - Solution: Use `gitInfo.rootDir` as base for relative paths in style helpers
  - StyleParser now constructs absolute component path from git root

- **Fixed template analysis not working (26/104 → 93/104 components)**
  - Template analysis failed for components with external templateUrl
  - Root cause: Same path resolution issue as styles (relative vs absolute)
  - Solution: TemplateParser constructs absolute component path from git root
  - generateTemplateLocation() uses gitInfo.rootDir for relative paths

- **Fixed Angular version detection with npm workspace catalogs**
  - Angular Material uses `"@angular/core": "catalog:"` which was returned as version
  - Added regex check to ignore `catalog:`, `workspace:`, `link:`, `file:` formats
  - Version detection now returns actual version or undefined

### 🔧 Technical Changes

- **VisitorContext interface**: Added `gitInfo?: GitRepository` field
- **VisitorContextImpl**: Now accepts and propagates `gitInfo` parameter
- **getSourceLocation()**: Prefers `gitInfo.rootDir` over `context.rootDir` for consistent paths
- **getDecorators()**: Accepts `gitInfo` parameter and passes to `getSourceLocation()`
- **angular-core-parser.ts**:
  - Git detection moved BEFORE parsing (was after)
  - All 5 parsers updated to pass `context.gitInfo` (19 function calls)
- **git-remote-parser.ts**:
  - `enrichEntities()` accepts `gitInfo` parameter
  - Reconstructs absolute paths from relative paths before URL generation
- **style-helpers.ts**:
  - `resolveStylePath()` tries `.scss` if `.css` doesn't exist
  - `generateStyleLocation()` uses `gitInfo.rootDir` for relative paths
  - `parseScssFile()` uses `gitInfo.rootDir` for relative paths
- **style-parser.ts**: Constructs absolute component path from `gitInfo.rootDir`
- **template-parser.ts**: Constructs absolute component path from `gitInfo.rootDir`
- **template-helpers.ts**: `generateTemplateLocation()` uses `gitInfo.rootDir` for relative paths
- **component-parser.ts**:
  - `extractStyleUrls()` normalizes `.css` → `.scss` if file exists
  - Added fs and path imports

### 🔄 Refactoring

- **Centralized path resolution helpers** in `git-helpers.ts`:
  - `getBaseDir()`: Prefers git root over parsing root for consistency
  - `resolveEntityPath()`: Resolves entity relative path to absolute path
  - `generateLocationMetadata()`: Generates consistent filePath + sourceUrl + exists
- **Refactored all path resolution code** to use new helpers:
  - Eliminates 5 instances of duplicated `baseDir = gitInfo?.rootDir || rootDir` pattern
  - Simplifies `parseScssFile()`, `generateStyleLocation()`, `generateTemplateLocation()`
  - Reduces code duplication in `style-parser.ts` and `template-parser.ts`

### ✅ Validation

- ✅ 0 paths with "../" in sample-angular-app output
- ✅ 0 paths with "../" in Angular Material output (was 219)
- ✅ MatAutocomplete has `styleUrls: ["autocomplete.scss"]` (was `.css`)
- ✅ All 370 entities have sourceUrl populated
- ✅ 73/104 components have existing style files (was ~0 before)
- ✅ 93/104 components have template analysis (was 26/104)
- ✅ All source URLs valid (was 372 broken)
- ✅ No duplicate path segments in style URLs

## [1.3.0] - 2025-10-03

### ⚠️ BREAKING CHANGES

**Full ESM Migration**: ng-parser is now a pure ES Module package. This resolves the ERR_REQUIRE_ESM error when importing `@angular/compiler`.

**Migration Guide**:
- **Node.js**: Requires Node.js 18.0.0+ with native ESM support
- **Import syntax**: Use `import` instead of `require()`
- **package.json**: If consuming this package, you may need to add `"type": "module"` to your package.json
- **TypeScript**: Update your tsconfig.json to use `"module": "NodeNext"` or `"ES2022"`

**Example Before**:
```javascript
const { NgParser } = require('@ttwtf/ng-parser');
```

**Example After**:
```javascript
import { NgParser } from '@ttwtf/ng-parser';
```

### 🐛 Bug Fixes

- **CRITICAL: Fixed ERR_REQUIRE_ESM error permanently**
  - Migrated entire project from CommonJS to ES Modules
  - `@angular/compiler` now imported as native ESM module
  - No more `require()` wrapper around dynamic imports
  - CLI bin script updated with ESM-compatible `__dirname` equivalent

### 🔧 Technical Changes

- **tsconfig.json**:
  - Changed `"module": "commonjs"` to `"module": "NodeNext"`
  - Changed `"moduleResolution": "node"` to `"moduleResolution": "NodeNext"`
  - Added `"isolatedModules": true`
- **package.json**:
  - Added `"type": "module"`
  - Added `"exports"` field for proper ESM entry points
- **All imports**: Added `.js` extensions to relative imports (TypeScript ESM requirement)
- **jest.config**: Converted from CommonJS to ESM format (`.mjs`)
  - Updated to use `ts-jest/presets/default-esm`
  - Added ESM-specific module name mapper
- **bin/ng-parser.ts**:
  - Added `fileURLToPath` and `import.meta.url` for ESM __dirname equivalent

### ✅ Validation

- All 134 unit tests passing
- CLI tested successfully on sample Angular app
- Build artifacts are pure ESM with native `export` statements
- No more CommonJS wrapper code in compiled output

## [1.2.2] - 2025-10-03

### 🐛 Bug Fixes
- **Fixed ERR_REQUIRE_ESM error**: Eliminated race condition when loading @angular/compiler
  - Added explicit `await loadAngularCompiler()` before template parsing
  - Removed top-level async pre-loading that didn't block execution
  - Template analysis now always has compiler loaded
- **All file paths now relative to parsing directory**
  - Entity locations: `app/components/dashboard.component.ts`
  - Template paths: `app/components/product-card.component.html`
  - Style paths: `app/components/product-card.component.scss`
  - No more absolute paths or `../../../` paths in outputs
  - Modified `getSourceLocation()` to accept `rootDir` parameter
  - Updated all path resolution functions in template and style helpers

### ✨ Features
- **Global styles in all export formats**
  - Added `globalStyles` to Markdown export with dedicated section
  - Added `globalStyles` to GraphRAG metadata
  - Already present in JSON full export
- **Enhanced Git SSH URL support**
  - Added support for `ssh://git@host/path/repo.git` format
  - Added generic `git@host:path/repo.git` fallback for custom Git servers
  - **Bitbucket Server support** (auto-hosted)
    - Converts SSH URLs: `ssh://git@bitbucket.company.com:7999/project/repo.git`
    - Generates correct source URLs: `/projects/PROJECT/repos/repo/browse`
    - Auto-detects Server vs Cloud by URL pattern
    - Handles custom SSH ports and `/scm/` paths

### 🔧 Changes
- `getSourceLocation()` signature: added optional `rootDir` parameter
- `getDecorators()` signature: added optional `rootDir` parameter
- `resolveTemplatePath()` signature: added optional `rootDir` parameter
- `resolveStylePath()` signature: added optional `rootDir` parameter
- `GraphMetadata` interface: added `globalStyles?: StyleFileMetadata[]`
- All parsers updated to pass `context.rootDir` to location functions

## [1.2.1] - 2025-10-03

### 🐛 Bug Fixes
- Fixed ERR_REQUIRE_ESM error when loading @angular/compiler
  - Converted static ESM import to dynamic import()
  - Added async loader with pre-loading strategy
  - Template parsing now gracefully handles unloaded compiler
  - Note: May show ExperimentalWarning in Node.js (non-breaking)

### 🔧 Changes
- Template helpers now use dynamic import for @angular/compiler
- Added fallback when compiler not yet loaded

## [1.2.0] - 2025-10-03

### ✨ Features

#### Global SCSS File Parsing
- **Auto-detection**: Automatically scans for global SCSS files at common locations
- **Search locations**: Project root and `src/` directory
- **Detected files**: `styles.scss`, `style.scss`, `theme.scss`, `variables.scss`, `_variables.scss`
- **Enabled by default**: No configuration required
- **Full parsing**: Extracts all `@import` and `@use` statements with line numbers
- **Git integration**: Includes source URLs for all global style files

#### Enhanced Component Analysis
- Template and style analysis now fully integrated into component entities
- All component style files include Git source URLs
- Multiple style files per component fully supported

### 🐛 Bug Fixes
- Fixed CLI not passing `rootDir` argument to `parser.parse()`
  - CLI was incorrectly using `process.cwd()` instead of the provided directory
  - Now correctly parses the specified directory path

### 📚 Documentation
- Added comprehensive "Advanced Features" section in README
- Documented template analysis with examples
- Documented style analysis with SCSS parsing
- Documented global styles auto-detection
- Documented Git integration features
- Added examples for all new features

### 🔧 Changes
- `AngularProject` metadata now includes optional `globalStyles` array
- Global styles are added to project metadata automatically when detected
- CLI console output shows count of detected global style files

## [1.1.0] - 2025-10-03

### ✨ Features

#### Git Integration (GitRemoteParser)
- Automatic Git repository detection (GitHub, GitLab, Bitbucket, Azure DevOps)
- Source URLs added to all entities with line-specific links
- Repository metadata in project output (provider, branch, remote URL)
- Configurable via `config.git.enabled` option

#### Template Analysis (TemplateParser)
- Parse inline templates (`template:`) and external templates (`templateUrl:`)
- Extract used components, directives, and pipes from HTML
- Analyze bindings (property, event, two-way, interpolation, attribute, class, style)
- Template complexity scoring based on nesting depth
- External template locations with Git source URLs

#### Style Analysis (StyleParser)
- Parse SCSS files for `@import` and `@use` statements
- Extract import/use paths with line numbers and full statements
- Resolve SCSS paths with support for partials and index files
- Style locations for all `styleUrls` with Git source URLs
- Skip Sass built-ins (e.g., `sass:math`)

### 🐛 Bug Fixes
- Fixed array validation in decorator argument parsing (component, module, directive, pipe, service parsers)
- Fixed relationship resolution for non-string targets
- Added relative paths in entity IDs instead of absolute paths
- Auto-detection of Angular version from package.json

### 🔧 Changes
- Added `@angular/compiler` to parse HTML templates
- Added `simple-git` dependency for Git operations
- Entity IDs now use paths relative to rootDir
- Component entities enriched with `templateLocation`, `templateAnalysis`, `styleLocations`, and `styleAnalysis`

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
