/**
 * Constant parser - Extracts InjectionTokens and exported constants
 */

import * as ts from 'typescript';
import type {
  ConstantEntity,
  Relationship,
  VisitorContext as OldVisitorContext,
} from '../../types/index.js';
import { EntityType, RelationType } from '../../types/index.js';
import {
  getSourceLocation,
  getDocumentation,
  generateEntityId,
} from '../../utils/ast-helpers.js';

/**
 * Parser for constants, InjectionTokens, and exported providers
 */
export class ConstantParser {
  private results: ConstantEntity[] = [];

  parse(node: ts.Node, context: OldVisitorContext): void {
    // Parse variable statements (const FOO = ...)
    if (ts.isVariableStatement(node)) {
      this.parseVariableStatement(node, context);
      return;
    }
  }

  private parseVariableStatement(
    node: ts.VariableStatement,
    context: OldVisitorContext
  ): void {
    // Only process exported constants
    const isExported = node.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    );

    if (!isExported) return;

    node.declarationList.declarations.forEach((decl) => {
      if (!ts.isIdentifier(decl.name)) return;

      const constantName = decl.name.text;
      const initializer = decl.initializer;

      if (!initializer) return;

      // Check if it's an InjectionToken
      if (ts.isNewExpression(initializer)) {
        const expr = initializer.expression;

        if (ts.isIdentifier(expr) && expr.text === 'InjectionToken') {
          this.parseInjectionToken(constantName, initializer, node, context);
          return;
        }
      }

      // Check if it's a function call (providers like provideNativeDateAdapter())
      if (ts.isCallExpression(initializer)) {
        const funcName = initializer.expression.getText(context.sourceFile);

        if (funcName.startsWith('provide')) {
          this.parseProviderFunction(constantName, initializer, node, context);
          return;
        }
      }

      // Check if it's an exported constant with Angular-related name patterns
      if (this.isAngularConstant(constantName)) {
        this.parseAngularConstant(constantName, initializer, node, context);
      }
    });
  }

  private parseInjectionToken(
    constantName: string,
    expr: ts.NewExpression,
    node: ts.VariableStatement,
    context: OldVisitorContext
  ): void {
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    // Extract token type from generic: InjectionToken<Type>
    let tokenType: string | undefined;
    if (expr.typeArguments && expr.typeArguments.length > 0) {
      tokenType = expr.typeArguments[0].getText(context.sourceFile);
    }

    const entity: ConstantEntity = {
      id: generateEntityId(location.filePath, constantName, EntityType.Constant, context.rootDir),
      type: EntityType.Constant,
      name: constantName,
      location,
      documentation: getDocumentation(node),
      constantType: 'InjectionToken',
      tokenType,
    };

    context.addEntity(entity);
    this.results.push(entity);
  }

  private parseProviderFunction(
    constantName: string,
    expr: ts.CallExpression,
    node: ts.VariableStatement,
    context: OldVisitorContext
  ): void {
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);
    const funcName = expr.expression.getText(context.sourceFile);

    const entity: ConstantEntity = {
      id: generateEntityId(location.filePath, constantName, EntityType.Constant, context.rootDir),
      type: EntityType.Constant,
      name: constantName,
      location,
      documentation: getDocumentation(node),
      constantType: 'function',
      value: funcName,
    };

    context.addEntity(entity);
    this.results.push(entity);
  }

  private parseAngularConstant(
    constantName: string,
    initializer: ts.Expression,
    node: ts.VariableStatement,
    context: OldVisitorContext
  ): void {
    const location = getSourceLocation(node, context.sourceFile, context.rootDir, context.gitInfo);

    const entity: ConstantEntity = {
      id: generateEntityId(location.filePath, constantName, EntityType.Constant, context.rootDir),
      type: EntityType.Constant,
      name: constantName,
      location,
      documentation: getDocumentation(node),
      constantType: 'const',
      value: initializer.getText(context.sourceFile).slice(0, 100), // Truncate long values
    };

    context.addEntity(entity);
    this.results.push(entity);
  }

  /**
   * Check if a constant name follows Angular naming patterns
   */
  private isAngularConstant(name: string): boolean {
    // Common Angular constant patterns
    const patterns = [
      /^MAT_.*_OPTIONS$/,           // MAT_AUTOCOMPLETE_DEFAULT_OPTIONS
      /^MAT_.*_STRATEGY$/,          // MAT_AUTOCOMPLETE_SCROLL_STRATEGY
      /^MAT_.*_ACCESSOR$/,          // MAT_AUTOCOMPLETE_VALUE_ACCESSOR
      /^MAT_.*_VALIDATORS$/,        // MAT_DATEPICKER_VALIDATORS
      /^MAT_.*_DEFAULT$/,           // MAT_CARD_DEFAULT_OPTIONS
      /^CDK_.*_PROVIDER$/,          // CDK_TREE_NODE_PROVIDER
      /^CDK_.*_CONFIG$/,            // CDK_COPY_TO_CLIPBOARD_CONFIG
      /^.*_DIRECTIVES$/,            // CARD_DIRECTIVES, MENU_DIRECTIVES
      /^.*_DECLARATIONS$/,          // CHIP_DECLARATIONS, EXPORTED_DECLARATIONS
      /^.*_PROVIDERS$/,             // FLEX_PROVIDERS, TABLE_PROVIDERS
      /^.*_COMPONENTS$/,            // ENTRY_COMMON_COMPONENTS
      /^STEPPER_GLOBAL_OPTIONS$/,
      /^FOCUS_MONITOR_.*_OPTIONS$/,
      /^INPUT_MODALITY_.*_OPTIONS$/,
      /^FLOATING_LABEL_PARENT$/,
      /^SELECTION_LIST$/,
    ];

    return patterns.some(pattern => pattern.test(name));
  }

  getResults(): ConstantEntity[] {
    return this.results;
  }

  reset(): void {
    this.results = [];
  }
}
