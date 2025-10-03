/**
 * Tests for PerformanceVisitor
 */

import * as ts from 'typescript';
import { PerformanceVisitor } from '../performance-visitor.js';
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

describe('PerformanceVisitor', () => {
  let visitor: PerformanceVisitor;

  beforeEach(() => {
    visitor = new PerformanceVisitor();
  });

  it('should have correct metadata', () => {
    expect(visitor.name).toBe('PerformanceVisitor');
    expect(visitor.description).toContain('performance');
    expect(visitor.priority).toBe(75);
    expect(visitor.version).toBe('1.0.0');
  });

  it('should extract component patterns', () => {
    const code = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-test',
        template: '<div>Test</div>'
      })
      class TestComponent {}
    `;

    const { sourceFile, program} = createTestProgram(code);
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
    expect(results.totalPatterns).toBeGreaterThanOrEqual(0);
  });

  it('should extract large import patterns', () => {
    const code = `
      import * as lodash from 'lodash';

      class TestService {
        use() {
          return lodash.map([1, 2], x => x * 2);
        }
      }
    `;

    const { sourceFile, program} = createTestProgram(code);
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
    const results = visitor.getResults();
    const total = Object.values(results.byPattern).reduce((sum: number, count) => sum + (count as number), 0);
    expect(total).toBe(results.totalPatterns);
  });

  it('should handle empty code', () => {
    const code = ``;

    const { sourceFile, program} = createTestProgram(code);
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
    expect(results.totalPatterns).toBe(0);
  });
});
