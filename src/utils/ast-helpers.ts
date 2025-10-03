/**
 * AST helper utilities
 */

import * as ts from 'typescript';
import * as path from 'path';
import type { SourceLocation, DecoratorMetadata } from '../types/index.js';

/**
 * Get source location from a node
 * If rootDir is provided, filePath will be relative to it
 */
export function getSourceLocation(node: ts.Node, sourceFile: ts.SourceFile, rootDir?: string): SourceLocation {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

  // Make path relative to rootDir if provided
  let filePath = sourceFile.fileName;
  if (rootDir) {
    filePath = path.relative(rootDir, sourceFile.fileName).replace(/\\/g, '/');
  }

  return {
    filePath,
    start: node.getStart(),
    end: node.getEnd(),
    line: line + 1,
    column: character + 1,
  };
}

/**
 * Extract JSDoc documentation from a node
 */
export function getDocumentation(node: ts.Node): string | undefined {
  const jsDocTags = (node as any).jsDoc;
  if (!jsDocTags || jsDocTags.length === 0) return undefined;

  const comments = jsDocTags
    .map((doc: any) => doc.comment)
    .filter(Boolean)
    .join('\n');

  return comments || undefined;
}

/**
 * Get modifiers from a node
 */
export function getModifiers(node: ts.Node): string[] {
  if (!ts.canHaveModifiers(node)) return [];

  const modifiers = ts.getModifiers(node);
  if (!modifiers) return [];

  return modifiers.map((mod) => ts.SyntaxKind[mod.kind].toLowerCase());
}

/**
 * Check if node is exported
 */
export function isExported(node: ts.Node): boolean {
  const modifiers = getModifiers(node);
  return modifiers.includes('export');
}

/**
 * Get decorator metadata from a node
 */
export function getDecorators(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  rootDir?: string
): DecoratorMetadata[] | undefined {
  if (!ts.canHaveDecorators(node)) return undefined;

  const decorators = ts.getDecorators(node);
  if (!decorators || decorators.length === 0) return undefined;

  return decorators.map((decorator) => {
    const expression = decorator.expression;
    let name = '';
    let args: Record<string, any> = {};

    if (ts.isCallExpression(expression)) {
      name = expression.expression.getText(sourceFile);
      // Extract arguments from decorator
      if (expression.arguments.length > 0) {
        const arg = expression.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          args = parseObjectLiteral(arg, sourceFile);
        }
      }
    } else if (ts.isIdentifier(expression)) {
      name = expression.getText(sourceFile);
    }

    return {
      name,
      arguments: args,
      location: getSourceLocation(decorator, sourceFile, rootDir),
    };
  });
}

/**
 * Parse object literal expression to plain object
 */
export function parseObjectLiteral(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): Record<string, any> {
  const result: Record<string, any> = {};

  node.properties.forEach((prop) => {
    if (ts.isPropertyAssignment(prop)) {
      const name = prop.name.getText(sourceFile);
      const value = parseExpression(prop.initializer, sourceFile);
      result[name] = value;
    }
  });

  return result;
}

/**
 * Parse expression to JavaScript value (simplified)
 */
export function parseExpression(node: ts.Expression, sourceFile: ts.SourceFile): any {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => parseExpression(el, sourceFile));
  }

  if (ts.isObjectLiteralExpression(node)) {
    return parseObjectLiteral(node, sourceFile);
  }

  // For complex expressions, return the text
  return node.getText(sourceFile);
}

/**
 * Get type name from a type node
 */
export function getTypeName(
  typeNode: ts.TypeNode | undefined,
  typeChecker: ts.TypeChecker
): string | undefined {
  if (!typeNode) return undefined;

  const type = typeChecker.getTypeFromTypeNode(typeNode);
  return typeChecker.typeToString(type);
}

/**
 * Generate unique ID for an entity
 */
export function generateEntityId(filePath: string, name: string, type: string, rootDir?: string): string {
  let normalized = filePath.replace(/\\/g, '/');

  // Make path relative to rootDir if provided
  if (rootDir) {
    const normalizedRoot = rootDir.replace(/\\/g, '/');
    if (normalized.startsWith(normalizedRoot)) {
      normalized = normalized.substring(normalizedRoot.length);
      // Remove leading slash
      if (normalized.startsWith('/')) {
        normalized = normalized.substring(1);
      }
    }
  }

  return `${type}:${normalized}:${name}`;
}

/**
 * Check if a decorator is an Angular decorator
 */
export function isAngularDecorator(decoratorName: string): boolean {
  const angularDecorators = [
    'Component',
    'Directive',
    'Pipe',
    'Injectable',
    'NgModule',
    'Input',
    'Output',
    'HostBinding',
    'HostListener',
    'ViewChild',
    'ViewChildren',
    'ContentChild',
    'ContentChildren',
  ];

  return angularDecorators.includes(decoratorName);
}

/**
 * Extract class name from a class declaration
 */
export function getClassName(node: ts.ClassDeclaration): string | undefined {
  return node.name?.getText();
}

/**
 * Get heritage clauses (extends/implements)
 */
export function getHeritageClauses(node: ts.ClassDeclaration): {
  extends?: string[];
  implements?: string[];
} {
  const result: { extends?: string[]; implements?: string[] } = {};

  if (!node.heritageClauses) return result;

  node.heritageClauses.forEach((clause) => {
    const types = clause.types.map((t) => t.expression.getText());

    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      result.extends = types;
    } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
      result.implements = types;
    }
  });

  return result;
}

/**
 * Check if a call expression is an Angular signal function
 */
export function isSignalFunction(node: ts.CallExpression, sourceFile: ts.SourceFile): {
  isSignal: boolean;
  signalType?: string;
} {
  const signalFunctions = [
    'signal',
    'computed',
    'input',
    'output',
    'model',
    'linkedSignal', // Angular 19+
    'viewChild',
    'viewChildren',
    'contentChild',
    'contentChildren',
  ];

  const expression = node.expression;
  let functionName = '';

  if (ts.isIdentifier(expression)) {
    functionName = expression.getText(sourceFile);
  } else if (ts.isPropertyAccessExpression(expression)) {
    functionName = expression.name.getText(sourceFile);
  }

  const isSignal = signalFunctions.includes(functionName);

  return {
    isSignal,
    signalType: isSignal ? functionName : undefined,
  };
}

/**
 * Extract lifecycle hooks from a class
 */
export function extractLifecycleHooks(node: ts.ClassDeclaration): string[] {
  const lifecycleHooks = [
    'ngOnInit',
    'ngOnDestroy',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterContentInit',
    'ngAfterContentChecked',
    'ngAfterViewInit',
    'ngAfterViewChecked',
  ];

  const hooks: string[] = [];

  node.members.forEach((member) => {
    if (ts.isMethodDeclaration(member) && member.name) {
      const methodName = member.name.getText();
      if (lifecycleHooks.includes(methodName)) {
        hooks.push(methodName);
      }
    }
  });

  return hooks;
}
