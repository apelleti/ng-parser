/**
 * Pipe parser - Core Angular parser (non-extensible)
 */

import * as ts from 'typescript';
import type {
  PipeEntity,
  VisitorContext as OldVisitorContext,
} from '../../types';
import { EntityType } from '../../types';
import {
  getSourceLocation,
  getDocumentation,
  getModifiers,
  getDecorators,
  generateEntityId,
  getClassName,
} from '../../utils/ast-helpers';

/**
 * Core parser for Angular @Pipe decorators
 */
export class PipeParser {
  private results: PipeEntity[] = [];

  /**
   * Parse a TypeScript node for @Pipe decorator
   */
  parse(node: ts.Node, context: OldVisitorContext): void {
    if (!ts.isClassDeclaration(node)) return;

    const decorators = getDecorators(node, context.sourceFile);
    if (!decorators) return;

    const pipeDecorator = decorators.find((d) => d.name === 'Pipe');
    if (!pipeDecorator) return;

    this.extractPipe(node, pipeDecorator, context);
  }

  private extractPipe(
    node: ts.ClassDeclaration,
    decorator: any,
    context: OldVisitorContext
  ): void {
    const className = getClassName(node);
    if (!className) return;

    const args = decorator.arguments;
    const location = getSourceLocation(node, context.sourceFile);

    const entity: PipeEntity = {
      id: generateEntityId(location.filePath, className, EntityType.Pipe),
      type: EntityType.Pipe,
      name: className,
      location,
      documentation: getDocumentation(node),
      decorators: getDecorators(node, context.sourceFile),
      modifiers: getModifiers(node),
      pipeName: args.name,
      pure: args.pure ?? true, // Pipes are pure by default
      standalone: args.standalone ?? false,
    };

    context.addEntity(entity);
    this.results.push(entity);
  }

  /**
   * Get all parsed pipes
   */
  getResults(): PipeEntity[] {
    return this.results;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.results = [];
  }
}
