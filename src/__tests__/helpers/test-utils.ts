/**
 * Test utilities for creating TypeScript programs and fixtures
 */

import * as ts from 'typescript';
import * as path from 'path';

/**
 * Create a TypeScript source file from code string
 */
export function createSourceFile(code: string, fileName: string = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, true);
}

/**
 * Create a TypeScript program from source code
 */
export function createProgram(code: string, fileName: string = 'test.ts'): {
  program: ts.Program;
  sourceFile: ts.SourceFile;
  typeChecker: ts.TypeChecker;
} {
  const sourceFile = createSourceFile(code, fileName);

  const compilerHost: ts.CompilerHost = {
    getSourceFile: (name: string) => {
      if (name === fileName) return sourceFile;
      // Return Angular core stubs for imports
      if (name.includes('@angular/core')) {
        return createAngularCoreStub();
      }
      return undefined;
    },
    writeFile: () => {},
    getCurrentDirectory: () => process.cwd(),
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName: string) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: (options: ts.CompilerOptions) => ts.getDefaultLibFilePath(options),
  };

  const program = ts.createProgram({
    rootNames: [fileName],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
    },
    host: compilerHost,
  });

  const typeChecker = program.getTypeChecker();

  return { program, sourceFile, typeChecker };
}

/**
 * Create a minimal Angular core stub for imports
 */
function createAngularCoreStub(): ts.SourceFile {
  const stubCode = `
    export function Component(config: any): any { return () => {}; }
    export function Injectable(config?: any): any { return () => {}; }
    export function NgModule(config: any): any { return () => {}; }
    export function Directive(config: any): any { return () => {}; }
    export function Pipe(config: any): any { return () => {}; }
    export function Input(config?: any): any { return () => {}; }
    export function Output(config?: any): any { return () => {}; }
    export class EventEmitter<T> {}
    export function signal<T>(value: T): any { return value; }
    export function computed<T>(fn: () => T): any { return fn(); }
    export function input<T>(config?: any): any { return () => {}; }
    export function output<T>(config?: any): any { return () => {}; }
    export function model<T>(config?: any): any { return () => {}; }
    export function viewChild<T>(config: any): any { return () => {}; }
    export function contentChild<T>(config: any): any { return () => {}; }
  `;
  return ts.createSourceFile('@angular/core.d.ts', stubCode, ts.ScriptTarget.ES2022, true);
}

/**
 * Find a class declaration by name in source file
 */
export function findClass(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | undefined {
  let result: ts.ClassDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Find decorator by name on a node
 */
export function findDecorator(
  node: ts.Node,
  decoratorName: string
): ts.Decorator | undefined {
  if (!ts.canHaveDecorators(node)) return undefined;

  const decorators = ts.getDecorators(node);
  if (!decorators) return undefined;

  return decorators.find((decorator) => {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression)) {
      const identifier = expression.expression;
      if (ts.isIdentifier(identifier)) {
        return identifier.text === decoratorName;
      }
    } else if (ts.isIdentifier(expression)) {
      return expression.text === decoratorName;
    }
    return false;
  });
}

/**
 * Extract decorator arguments as object
 */
export function getDecoratorArguments(decorator: ts.Decorator): any {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) return {};

  const args = expression.arguments;
  if (args.length === 0) return {};

  const firstArg = args[0];
  if (!ts.isObjectLiteralExpression(firstArg)) return {};

  const result: any = {};

  firstArg.properties.forEach((prop) => {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      const key = prop.name.text;
      const value = prop.initializer;

      if (ts.isStringLiteral(value)) {
        result[key] = value.text;
      } else if (ts.isNumericLiteral(value)) {
        result[key] = Number(value.text);
      } else if (value.kind === ts.SyntaxKind.TrueKeyword) {
        result[key] = true;
      } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
        result[key] = false;
      } else if (ts.isArrayLiteralExpression(value)) {
        result[key] = value.elements.map((el) => {
          if (ts.isStringLiteral(el)) return el.text;
          return el.getText();
        });
      } else {
        result[key] = value.getText();
      }
    }
  });

  return result;
}

/**
 * Create a mock VisitorContext for testing core parsers
 */
export function createMockContext(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  program: ts.Program
): any {
  const entities = new Map();
  const relationships: any[] = [];

  return {
    sourceFile,
    typeChecker,
    program,
    entities,
    relationships,
    addEntity(entity: any) {
      entities.set(entity.id, entity);
    },
    addRelationship(relationship: any) {
      relationships.push(relationship);
    },
  };
}
