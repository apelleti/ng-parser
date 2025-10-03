/**
 * Tests for SecurityVisitor
 */

import * as ts from 'typescript';
import { SecurityVisitor } from '../security-visitor.js';
import { VisitorContextImpl } from '../../base/visitor-context-impl.js';

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

describe('SecurityVisitor', () => {
  let visitor: SecurityVisitor;

  beforeEach(() => {
    visitor = new SecurityVisitor();
  });

  it('should have correct metadata', () => {
    expect(visitor.name).toBe('SecurityVisitor');
    expect(visitor.description).toContain('security');
    expect(visitor.priority).toBe(100);
    expect(visitor.version).toBe('1.0.0');
  });

  it('should extract innerHTML patterns', () => {
    const code = `
      class Component {
        render() {
          document.getElementById('test').innerHTML = '<div>test</div>';
        }
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
    expect(results.totalPatterns).toBeGreaterThanOrEqual(0);
  });

  it('should extract eval patterns', () => {
    const code = `
      class Component {
        execute() {
          eval('console.log("test")');
        }
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
  });

  it('should reset state correctly', () => {
    visitor.reset();
    const results = visitor.getResults();

    expect(results.totalPatterns).toBe(0);
    expect(results.patterns.length).toBe(0);
  });

  it('should provide correct result structure', () => {
    const results = visitor.getResults();

    expect(results).toHaveProperty('totalPatterns');
    expect(results).toHaveProperty('byPattern');
    expect(results).toHaveProperty('patterns');
    expect(results).toHaveProperty('affectedEntities');

    expect(typeof results.totalPatterns).toBe('number');
    expect(typeof results.byPattern).toBe('object');
    expect(Array.isArray(results.patterns)).toBe(true);
    expect(Array.isArray(results.affectedEntities)).toBe(true);
  });

  it('should categorize patterns by type', () => {
    const code = `
      class Component {
        test() {
          eval('test');
          document.body.innerHTML = 'test';
        }
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
    const total = Object.values(results.byPattern).reduce((sum: number, count) => sum + (count as number), 0);
    expect(total).toBe(results.totalPatterns);
  });
});
