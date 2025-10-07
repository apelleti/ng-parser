/**
 * Provider parsing helpers
 * Extracts dependencies from Angular provider configurations
 */

import * as ts from 'typescript';
import { getPrimaryTypeName } from './type-helpers.js';

export interface ProviderInfo {
  token: string;           // The injection token
  implementation?: string; // useClass, useFactory, useExisting
  value?: string;          // useValue (if it's a reference)
  multi?: boolean;
}

/**
 * Parse Angular provider configurations
 * Handles: { provide: X, useClass: Y }, { provide: X, useFactory: fn }, etc.
 */
export function parseProviders(
  providersArray: any[] | undefined,
  sourceFile: ts.SourceFile
): ProviderInfo[] {
  if (!providersArray || !Array.isArray(providersArray)) {
    return [];
  }

  const result: ProviderInfo[] = [];

  for (const provider of providersArray) {
    // Simple class provider: [MyService]
    if (typeof provider === 'string') {
      result.push({
        token: provider,
        implementation: provider,
      });
      continue;
    }

    // Complex provider: { provide: X, useClass: Y, ... }
    if (typeof provider === 'object') {
      const info = parseProviderObject(provider, sourceFile);
      if (info) {
        result.push(info);
      }
    }
  }

  return result;
}

/**
 * Parse provider object literal
 */
function parseProviderObject(
  provider: Record<string, any>,
  sourceFile: ts.SourceFile
): ProviderInfo | null {
  const token = provider.provide;
  if (!token) return null;

  const info: ProviderInfo = {
    token: typeof token === 'string' ? token : String(token),
    multi: provider.multi === true,
  };

  // useClass
  if (provider.useClass) {
    info.implementation = typeof provider.useClass === 'string'
      ? provider.useClass
      : String(provider.useClass);
  }

  // useFactory
  if (provider.useFactory) {
    info.implementation = typeof provider.useFactory === 'string'
      ? provider.useFactory
      : String(provider.useFactory);
  }

  // useExisting
  if (provider.useExisting) {
    info.implementation = typeof provider.useExisting === 'string'
      ? provider.useExisting
      : String(provider.useExisting);
  }

  // useValue - only if it's a reference to a constant
  if (provider.useValue && typeof provider.useValue === 'string') {
    info.value = provider.useValue;
  }

  return info;
}

/**
 * Extract provider configurations from AST node
 * Handles complex provider objects directly from TypeScript AST
 */
export function extractProvidersFromAST(
  node: ts.ArrayLiteralExpression,
  sourceFile: ts.SourceFile
): ProviderInfo[] {
  const result: ProviderInfo[] = [];

  for (const element of node.elements) {
    // Simple provider: MyService
    if (ts.isIdentifier(element)) {
      result.push({
        token: element.text,
        implementation: element.text,
      });
      continue;
    }

    // Object literal provider: { provide: X, useClass: Y }
    if (ts.isObjectLiteralExpression(element)) {
      const info = parseProviderObjectAST(element, sourceFile);
      if (info) {
        result.push(info);
      }
    }

    // Spread operator: ...PROVIDERS
    if (ts.isSpreadElement(element)) {
      const spreadExpr = element.expression;
      if (ts.isIdentifier(spreadExpr)) {
        // We'll handle this in spread resolver
        result.push({
          token: `...${spreadExpr.text}`,
          implementation: spreadExpr.text,
        });
      }
    }
  }

  return result;
}

/**
 * Parse provider object from AST
 */
function parseProviderObjectAST(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): ProviderInfo | null {
  let token: string | undefined;
  let implementation: string | undefined;
  let value: string | undefined;
  let multi = false;

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    const propName = prop.name.getText(sourceFile);
    const initializer = prop.initializer;

    switch (propName) {
      case 'provide':
        token = extractTokenFromInitializer(initializer, sourceFile);
        break;
      case 'useClass':
        implementation = extractTokenFromInitializer(initializer, sourceFile);
        break;
      case 'useFactory':
        implementation = extractTokenFromInitializer(initializer, sourceFile);
        break;
      case 'useExisting':
        implementation = extractTokenFromInitializer(initializer, sourceFile);
        break;
      case 'useValue':
        // Only extract if it's a reference (identifier), not a literal
        if (ts.isIdentifier(initializer)) {
          value = initializer.text;
        }
        break;
      case 'multi':
        multi = initializer.kind === ts.SyntaxKind.TrueKeyword;
        break;
    }
  }

  if (!token) return null;

  return {
    token,
    implementation,
    value,
    multi,
  };
}

/**
 * Extract token name from initializer expression
 */
function extractTokenFromInitializer(
  node: ts.Expression,
  sourceFile: ts.SourceFile
): string | undefined {
  // Simple identifier: MyService
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  // Property access: SomeClass.TOKEN
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }

  // New expression: new InjectionToken(...)
  if (ts.isNewExpression(node)) {
    if (ts.isIdentifier(node.expression)) {
      // Extract first argument if it's a string
      if (node.arguments && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          return firstArg.text;
        }
      }
      return node.expression.text;
    }
  }

  // For complex expressions, return the text
  const text = node.getText(sourceFile);
  return getPrimaryTypeName(text) || text;
}
