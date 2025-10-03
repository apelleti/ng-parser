# ng-parser Examples

Working examples demonstrating ng-parser features.

## Quick Start

```bash
# Run examples
npx ts-node examples/01-quick-start.ts
npx ts-node examples/02-custom-visitors.ts
npx ts-node examples/03-complete-analysis.ts
```

## Examples

| Example | Description |
|---------|-------------|
| **01-quick-start.ts** | Basic parsing with built-in visitors |
| **02-custom-visitors.ts** | Creating custom analysis visitors |
| **03-complete-analysis.ts** | Complete workflow with all export formats |

## Sample Angular App

The `sample-angular-app/` contains a realistic Angular app with **intentional issues** for visitor demonstrations:

- Memory leaks (RxJS without unsubscribe)
- XSS vulnerabilities (innerHTML usage)
- Security issues (eval, hardcoded secrets)
- Performance problems (missing OnPush)

### New: Template & Style Parsing Examples

#### ProductCardComponent
Demonstrates external HTML template and SCSS parsing:
- **Template**: `product-card.component.html` - Complex bindings, pipes, directives
- **Styles**: `product-card.component.scss` - SCSS `@use` and `@import` statements
- **Parsed features**:
  - Property bindings: `[class.available]`, `[disabled]`, `[attr.aria-label]`
  - Event bindings: `(click)`, `(error)`
  - Pipes: `formatDate`, `number`
  - Template refs: `#wishlistBtn`
  - SCSS imports: `../styles/mixins`, `../styles/animations`
  - SCSS uses: `sass:math`, `../styles/variables as vars`

#### UserProfileComponent
Demonstrates multiple style files:
- **Template**: `user-profile.component.html` - Structural directives (`*ngIf`, `*ngFor`)
- **Styles**: Three SCSS files (main, responsive, theme)
- **All files** include Git source URLs

### Running the Examples

```bash
# Parse the sample app
npm run build
node dist/bin/ng-parser.js parse examples/sample-angular-app -o examples/sample-output.json -f full

# View template analysis
cat examples/sample-output.json | jq '.entities | .[] | select(.name == "ProductCardComponent") | .templateAnalysis'

# View style analysis
cat examples/sample-output.json | jq '.entities | .[] | select(.name == "ProductCardComponent") | .styleAnalysis'
```

### Example Output

**Template Analysis:**
```json
{
  "usedPipes": ["formatDate", "number"],
  "bindings": [
    {"type": "property", "name": "available", "expression": "isAvailable"},
    {"type": "event", "name": "click", "expression": "onAddToCart()"}
  ],
  "templateRefs": ["wishlistBtn"],
  "complexity": 75
}
```

**Style Analysis:**
```json
{
  "imports": [
    {"path": "../styles/mixins", "statement": "@import '../styles/mixins'", "line": 3}
  ],
  "uses": [
    {"path": "../styles/variables", "statement": "@use '../styles/variables' as vars", "namespace": "vars", "line": 2}
  ]
}
```

See the [main README](../README.md) for complete documentation.
