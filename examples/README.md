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

See the [main README](../README.md) for complete documentation.
