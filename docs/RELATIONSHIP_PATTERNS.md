# Relationship Patterns in ng-parser

## Overview

This document explains common relationship patterns found in Angular applications and how ng-parser handles them.

## Self-References

### What are Self-References?

Self-references occur when a relationship has `source === target`. While this may seem unusual, it's a legitimate Angular pattern.

### Common Cases

#### 1. Self-Providing Components

Angular components often provide themselves in their providers array:

```typescript
@Component({
  selector: 'mat-form-field',
  providers: [MatFormField], // Self-reference!
})
export class MatFormField {
  // ...
}
```

This creates a relationship:
```json
{
  "type": "provides",
  "source": "component:mat-form-field.ts:MatFormField",
  "target": "component:mat-form-field.ts:MatFormField"
}
```

**Why?** This allows child components to inject the parent component via DI.

#### 2. Singleton Services

Services may inject themselves (via a factory) for singleton patterns:

```typescript
@Injectable()
export class DialogService {
  constructor(@Optional() @SkipSelf() parent: DialogService) {
    // Check if parent instance exists
  }
}
```

### Statistics

In the Angular Components monorepo:
- **61 self-references** total
- Mainly in `provides` relationships
- All legitimate Angular patterns

### Handling

ng-parser **does not filter** self-references as they represent real dependency patterns in the codebase.

---

## Internal-File References

### What are Internal-File References?

Relationships with targets like `internal-file:./path:TypeName` indicate:
- The import path points to a file within the project
- The file exists
- But the entity was not parsed (interface, type alias, etc.)

### Common Cases

```json
{
  "type": "injects",
  "source": "component:dialog.ts:Dialog",
  "target": "internal-file:@angular/cdk/dialog:DialogRef",
  "metadata": {
    "classification": "internal",
    "resolved": false
  }
}
```

This is **normal** for:
- TypeScript interfaces (not classes)
- Type aliases
- Const enums
- Files that don't export Angular entities

### Statistics

Approximately **47 internal-file references** in Angular Components monorepo.

---

## Deduplication Strategy

### Global Deduplication

ng-parser applies deduplication at two levels:

1. **Template level** (during template parsing)
   - Prevents duplicate `usesInTemplate` relationships
   - Applied per-component

2. **Global level** (after all parsing)
   - Removes duplicates from entity parsers
   - Applied to all relationship types
   - Key: `${source}::${target}::${type}`

### Why Duplicates Occur

Duplicates can arise from:
- Multiple decorators on the same class
- Complex provider configurations
- Template analysis finding the same usage multiple times

### Results

After deduplication:
- **99.8%+** unique relationships
- Typical removal: 14-20 duplicates in large codebases

---

## Classification System

### Internal

- Both source and target are project entities
- Fully resolved to entity IDs

### Internal-File

- Import points to project file
- File exists but entity not parsed
- Common for interfaces/types

### External

- Import points to node_modules
- Package name and version tracked

### Unresolved

- Could not resolve import path
- Or target entity doesn't exist
- Includes Angular core directives (ng-content, etc.)

---

## Best Practices

When analyzing ng-parser output:

1. **Self-references are normal** - Don't treat as errors
2. **Internal-file is legitimate** - Not a parsing failure
3. **Unresolved ≠ broken** - May be external Angular APIs
4. **Check classification** - Use it to understand dependency types

---

*Last updated: 2025-10-06*
