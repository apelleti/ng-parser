/**
 * Helpers for extracting inject() function calls (Angular v14+ pattern)
 */

import * as ts from 'typescript';

export interface InjectCall {
  token: string;        // Type or token being injected (e.g., "PLATFORM_ID", "Document")
  propertyName?: string; // Property name if it's a property injection
  optional?: boolean;   // inject(Token, {optional: true})
  self?: boolean;       // inject(Token, {self: true})
  skipSelf?: boolean;   // inject(Token, {skipSelf: true})
  host?: boolean;       // inject(Token, {host: true})
}

/**
 * Extract inject() calls from class properties
 *
 * @example
 * class MyService {
 *   private _platform = inject(Platform);
 *   private _doc = inject(DOCUMENT, {optional: true});
 * }
 */
export function extractPropertyInjectCalls(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): InjectCall[] {
  const injectCalls: InjectCall[] = [];

  node.members.forEach((member) => {
    if (!ts.isPropertyDeclaration(member)) return;
    if (!member.initializer) return;

    const injectCall = parseInjectExpression(member.initializer, sourceFile);
    if (injectCall) {
      injectCalls.push({
        ...injectCall,
        propertyName: member.name.getText(sourceFile),
      });
    }
  });

  return injectCalls;
}

/**
 * Extract inject() calls from constructor body
 *
 * @example
 * constructor() {
 *   const doc = inject(DOCUMENT);
 *   this._platform = inject(Platform);
 * }
 */
export function extractConstructorInjectCalls(
  constructor: ts.ConstructorDeclaration,
  sourceFile: ts.SourceFile
): InjectCall[] {
  const injectCalls: InjectCall[] = [];

  if (!constructor.body) return injectCalls;

  // Visit all statements in constructor body
  constructor.body.statements.forEach((statement) => {
    visitStatementForInject(statement, sourceFile, injectCalls);
  });

  return injectCalls;
}

/**
 * Visit a statement recursively to find inject() calls
 */
function visitStatementForInject(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  injectCalls: InjectCall[]
): void {
  // Variable declaration: const foo = inject(Token)
  if (ts.isVariableStatement(node)) {
    node.declarationList.declarations.forEach((decl) => {
      if (decl.initializer) {
        const injectCall = parseInjectExpression(decl.initializer, sourceFile);
        if (injectCall) {
          injectCalls.push(injectCall);
        }
      }
    });
    return;
  }

  // Expression statement: this._foo = inject(Token)
  if (ts.isExpressionStatement(node)) {
    const expr = node.expression;

    // Binary expression: this._foo = inject(Token)
    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const injectCall = parseInjectExpression(expr.right, sourceFile);
      if (injectCall) {
        injectCalls.push(injectCall);
      }
    }

    // Direct call: inject(Token).doSomething()
    const injectCall = parseInjectExpression(expr, sourceFile);
    if (injectCall) {
      injectCalls.push(injectCall);
    }
  }

  // Recurse into block statements (if, for, etc.)
  ts.forEachChild(node, (child) => {
    visitStatementForInject(child, sourceFile, injectCalls);
  });
}

/**
 * Parse an inject() call expression
 *
 * Handles:
 * - inject(Token)
 * - inject(Token, {optional: true})
 * - inject(Token, {optional: true, skipSelf: true})
 */
function parseInjectExpression(
  expr: ts.Expression,
  sourceFile: ts.SourceFile
): InjectCall | null {
  if (!ts.isCallExpression(expr)) return null;

  // Check if it's a call to inject()
  const callExpr = expr as ts.CallExpression;
  const funcName = callExpr.expression.getText(sourceFile);

  if (funcName !== 'inject') return null;

  // Must have at least 1 argument (the token)
  if (callExpr.arguments.length === 0) return null;

  const token = callExpr.arguments[0].getText(sourceFile);
  const injectCall: InjectCall = { token };

  // Parse options (second argument)
  if (callExpr.arguments.length > 1) {
    const optionsArg = callExpr.arguments[1];

    if (ts.isObjectLiteralExpression(optionsArg)) {
      optionsArg.properties.forEach((prop) => {
        if (!ts.isPropertyAssignment(prop)) return;

        const propName = prop.name.getText(sourceFile);
        const propValue = prop.initializer.getText(sourceFile);

        if (propName === 'optional' && propValue === 'true') {
          injectCall.optional = true;
        } else if (propName === 'self' && propValue === 'true') {
          injectCall.self = true;
        } else if (propName === 'skipSelf' && propValue === 'true') {
          injectCall.skipSelf = true;
        } else if (propName === 'host' && propValue === 'true') {
          injectCall.host = true;
        }
      });
    }
  }

  return injectCall;
}
