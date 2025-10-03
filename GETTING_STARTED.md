# Getting Started with ng-parser

## Installation

```bash
npm install ng-parser
# Install peer dependencies
npm install @angular/compiler @angular/compiler-cli @angular/core
```

## Basic Usage

```typescript
import { NgParser } from 'ng-parser';

const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

console.log(`Entities: ${result.metadata.totalEntities}`);
```

## Next Steps

See [examples/README.md](./examples/README.md) for complete examples.
