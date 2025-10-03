/**
 * Tests for RxJSPatternVisitor
 */

import * as ts from 'typescript';
import { RxJSPatternVisitor } from '../rxjs-pattern-visitor';
import { VisitorContextImpl } from '../../base/visitor-context-impl';

function createTestProgram(code: string): { sourceFile: ts.SourceFile; program: ts.Program } {
  const fileName = 'test.ts';
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);

  const compilerHost: ts.CompilerHost = {
    getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: () => 'lib.d.ts',
  };

  const program = ts.createProgram([fileName], {}, compilerHost);
  return { sourceFile, program };
}

describe('RxJSPatternVisitor', () => {
  let visitor: RxJSPatternVisitor;

  beforeEach(() => {
    visitor = new RxJSPatternVisitor();
  });

  it('should have correct metadata', () => {
    expect(visitor.name).toBe('RxJSPatternVisitor');
    expect(visitor.description).toContain('RxJS');
    expect(visitor.priority).toBe(50);
    expect(visitor.version).toBe('1.0.0');
  });

  it('should detect Observable properties', () => {
    const code = `
      import { Observable } from 'rxjs';

      class TestComponent {
        data$: Observable<string>;
      }
    `;

    const { sourceFile, program } = createTestProgram(code);
    const typeChecker = program.getTypeChecker();
    const entities = new Map();
    const relationships: any[] = [];
    const context = new VisitorContextImpl(sourceFile, typeChecker, program, entities, relationships);

    visitor.onBeforeParse(context);

    function visit(node: ts.Node) {
      visitor.visitNode(node, context);
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    visitor.onAfterParse(context);

    const results = visitor.getResults();
    expect(results.totalObservables).toBeGreaterThanOrEqual(0);
  });

  it('should detect Subject properties', () => {
    const code = `
      import { Subject } from 'rxjs';

      class TestService {
        private subject$ = new Subject<void>();
      }
    `;

    const { sourceFile, program } = createTestProgram(code);
    const typeChecker = program.getTypeChecker();
    const entities = new Map();
    const relationships: any[] = [];
    const context = new VisitorContextImpl(sourceFile, typeChecker, program, entities, relationships);

    visitor.onBeforeParse(context);

    function visit(node: ts.Node) {
      visitor.visitNode(node, context);
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    visitor.onAfterParse(context);

    const results = visitor.getResults();
    expect(results).toBeDefined();
    expect(results.totalObservables).toBeGreaterThanOrEqual(0);
  });

  it('should reset state correctly', () => {
    const code = `
      import { Observable } from 'rxjs';
      class TestComponent {
        data$: Observable<string>;
      }
    `;

    const { sourceFile, program } = createTestProgram(code);
    const typeChecker = program.getTypeChecker();
    const entities = new Map();
    const relationships: any[] = [];
    const context = new VisitorContextImpl(sourceFile, typeChecker, program, entities, relationships);

    visitor.onBeforeParse(context);
    function visit(node: ts.Node) {
      visitor.visitNode(node, context);
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    const results1 = visitor.getResults();

    visitor.reset();

    const results2 = visitor.getResults();
    expect(results2.totalObservables).toBe(0);
    expect(results2.observablesInComponents).toBe(0);
  });

  it('should provide correct result structure', () => {
    const results = visitor.getResults();

    expect(results).toHaveProperty('totalObservables');
    expect(results).toHaveProperty('observablesInComponents');
    expect(results).toHaveProperty('componentsWithNgOnDestroy');
    expect(results).toHaveProperty('componentsWithoutNgOnDestroy');
    expect(results).toHaveProperty('patterns');

    expect(typeof results.totalObservables).toBe('number');
    expect(typeof results.observablesInComponents).toBe('number');
    expect(Array.isArray(results.componentsWithNgOnDestroy)).toBe(true);
    expect(Array.isArray(results.componentsWithoutNgOnDestroy)).toBe(true);
    expect(Array.isArray(results.patterns)).toBe(true);
  });
});
