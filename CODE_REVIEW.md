# Code Review Standards

## Overview

This document defines the code quality and review standards for ng-parser. All contributions must meet these standards before being merged.

## Core Principles

### 1. Separation of Concerns
- **Core parsers** extract Angular entities (non-extensible)
- **Visitors** extract patterns (extensible)
- **Parsers and visitors do NOT evaluate or recommend**

✅ Good: Extract that a component uses `innerHTML`
❌ Bad: Report that `innerHTML` is "dangerous" or "high severity"

### 2. Extraction over Evaluation
All parsers and visitors must:
- Extract **facts**, not opinions
- Provide **data**, not judgments
- Return **patterns**, not recommendations

### 3. Explicit over Implicit
- Clear, descriptive names
- Documented public APIs
- No hidden side effects
- Explicit dependencies

## Code Quality Standards

### TypeScript

#### Type Safety
```typescript
// ✅ Good: Explicit types
function parseComponent(node: ts.ClassDeclaration): ComponentEntity | null {
  // ...
}

// ❌ Bad: Implicit any
function parseComponent(node) {
  // ...
}
```

#### Null Safety
```typescript
// ✅ Good: Handle undefined
const name = node.name?.getText() || 'anonymous';

// ❌ Bad: Assume presence
const name = node.name.getText();
```

#### Type Exports
```typescript
// ✅ Good: Export interfaces for users
export interface MyResult {
  patterns: MyPattern[];
}

// ❌ Bad: Internal-only types
interface MyResult { /* not exported */ }
```

### Naming Conventions

#### Files
- **Parsers**: `component-parser.ts`, `service-parser.ts`
- **Visitors**: `rxjs-pattern-visitor.ts`, `security-visitor.ts`
- **Types**: `types.ts`, `entities.ts`
- **Tests**: `component-parser.test.ts`

#### Classes
- **Parsers**: `ComponentParser`, `ServiceParser`
- **Visitors**: `RxJSPatternVisitor`, `SecurityVisitor`
- **Interfaces**: `IComponentParser` (only for abstractions)

#### Variables/Functions
```typescript
// ✅ Good: Descriptive, clear intent
const componentDecorator = getDecorator(node, 'Component');
function extractInputProperties(node: ts.ClassDeclaration): Property[] {}

// ❌ Bad: Vague, unclear
const dec = getDecorator(node, 'Component');
function getProps(node: ts.ClassDeclaration): Property[] {}
```

### Testing Standards

#### Coverage Requirements
- **Core parsers**: ≥ 90% coverage
- **Visitors**: ≥ 85% coverage
- **Utilities**: ≥ 80% coverage

#### Test Structure
```typescript
describe('ComponentParser', () => {
  describe('parseComponent()', () => {
    it('should extract standalone component metadata', () => {
      // Arrange
      const source = `
        @Component({ selector: 'app-test', standalone: true })
        class TestComponent {}
      `;

      // Act
      const result = parseComponent(source);

      // Assert
      expect(result.standalone).toBe(true);
    });

    it('should return null for non-component classes', () => {
      const source = `class NotAComponent {}`;
      expect(parseComponent(source)).toBeNull();
    });
  });
});
```

#### Test Data
- Use **real Angular patterns** in test fixtures
- Include **edge cases** (missing decorators, malformed code)
- Test **error handling** (invalid input, TypeScript errors)

### Documentation

#### Public APIs
All public classes, methods, and types must have JSDoc:

```typescript
/**
 * Extracts RxJS observable usage patterns from Angular entities.
 *
 * This visitor identifies Observable, Subject, BehaviorSubject, and ReplaySubject
 * properties and checks for ngOnDestroy lifecycle hook presence.
 *
 * @example
 * ```typescript
 * const visitor = new RxJSPatternVisitor();
 * parser.registerVisitor(visitor);
 * const result = await parser.parse();
 * const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor');
 * ```
 */
export class RxJSPatternVisitor extends BaseVisitor<RxJSPatternResults> {
  // ...
}
```

#### Complex Logic
Add inline comments for non-obvious code:

```typescript
// Check if property type is Observable-based (Observable, Subject, BehaviorSubject, etc.)
const typeText = property.type?.getText() || '';
if (typeText.includes('Observable') || typeText.includes('Subject')) {
  // Extract pattern...
}
```

## Visitor Guidelines

### DO
✅ Extract factual patterns
✅ Store location information
✅ Count occurrences
✅ Categorize by type
✅ Implement `reset()` for reusability
✅ Add metrics via `addMetric()`

### DON'T
❌ Assign severity levels
❌ Recommend fixes
❌ Evaluate code quality
❌ Make judgments about patterns
❌ Log to console (except debugging)
❌ Modify source code

### Example: Good Visitor
```typescript
export class SecurityVisitor extends BaseVisitor<SecurityResults> {
  private patterns: SecurityPattern[] = [];

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    // Extract innerHTML usage (fact)
    if (ts.isPropertyAccessExpression(node) &&
        node.name.text === 'innerHTML') {
      this.patterns.push({
        pattern: 'innerHTML',
        entityName: this.getCurrentEntityName(),
        location: this.getLocation(node, context),
      });
    }
  }

  getResults(): SecurityResults {
    return {
      patterns: this.patterns,
      totalPatterns: this.patterns.length,
      byPattern: this.groupByPattern(),
    };
  }
}
```

### Example: Bad Visitor
```typescript
// ❌ BAD: Evaluates severity and recommends fixes
export class BadSecurityVisitor extends BaseVisitor<any> {
  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    if (node.text === 'innerHTML') {
      // ❌ Don't judge severity
      const issue = {
        severity: 'HIGH',
        message: 'Dangerous XSS vulnerability!',
        recommendation: 'Use textContent instead',
      };
      this.issues.push(issue);
    }
  }
}
```

## Performance Guidelines

### AST Traversal
- Don't create unnecessary AST walks
- Reuse TypeScript's visitor pattern
- Cache expensive lookups

### Memory Management
```typescript
// ✅ Good: Reset state between parses
reset(): void {
  super.reset();
  this.patterns = [];
  this.cache.clear();
}

// ❌ Bad: Memory leak
// No reset() implementation, state accumulates
```

### Async Operations
```typescript
// ✅ Good: Use async when needed
async visitEntity(entity: Entity): Promise<void> {
  const data = await this.fetchData();
}

// ✅ Good: Synchronous when possible
visitEntity(entity: Entity): void {
  this.patterns.push(this.extractPattern(entity));
}
```

## Error Handling

### Visitor Errors
```typescript
// ✅ Good: Report errors via context
if (!isValidPattern(pattern)) {
  this.addError(context, 'INVALID_PATTERN',
    `Pattern validation failed: ${pattern}`);
  return;
}

// ❌ Bad: Throw errors
if (!isValidPattern(pattern)) {
  throw new Error('Invalid pattern!');
}
```

### Warnings
```typescript
// ✅ Good: Report warnings for recoverable issues
if (entity.metadata?.deprecated) {
  this.addWarning(context, 'DEPRECATED_ENTITY',
    `Entity ${entity.name} uses deprecated Angular feature`);
}
```

## Git Workflow

### Commits
- **Atomic commits**: One logical change per commit
- **Descriptive messages**: Explain why, not what
- **Reference issues**: Include issue number when applicable

```
Good commit messages:
✅ feat(visitors): add RxJS pattern extraction visitor
✅ fix(component-parser): handle missing selector metadata
✅ refactor(types): separate entity types from visitor types
✅ test(security-visitor): add tests for innerHTML detection

Bad commit messages:
❌ update code
❌ fix bug
❌ changes
```

### Pull Requests
1. **Title**: Clear description of changes
2. **Description**:
   - What changed?
   - Why was it needed?
   - How was it tested?
3. **Tests**: Include tests for new features
4. **Docs**: Update docs if API changed

### PR Template
```markdown
## Description
Brief description of changes

## Motivation
Why was this change needed?

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] Follows separation of concerns (extraction vs evaluation)
```

## Review Checklist

### For Reviewers
- [ ] Code follows separation of concerns
- [ ] No evaluation/judgment in parsers/visitors
- [ ] Tests added for new features
- [ ] Code coverage maintained
- [ ] Public APIs documented
- [ ] TypeScript types are explicit
- [ ] Error handling is appropriate
- [ ] Performance implications considered
- [ ] Breaking changes are documented

### For Authors
- [ ] Self-reviewed code
- [ ] All tests pass locally
- [ ] Linter passes
- [ ] Documentation updated
- [ ] Breaking changes noted in PR description
- [ ] Examples updated if needed

## Release Process

### Versioning (Semantic Versioning)
- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features, backward compatible
- **Patch** (0.0.x): Bug fixes

### Pre-release Checklist
- [ ] All tests pass
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Documentation reviewed
- [ ] Examples tested
- [ ] Migration guide (for breaking changes)

## Questions?

If you're unsure about any of these standards:
1. Check existing code for examples
2. Ask in PR comments
3. Refer to ARCHITECTURE.md for design principles
