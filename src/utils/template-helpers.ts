/**
 * Template helper utilities
 * Parse and analyze Angular HTML templates
 */

import * as path from 'path';
import * as fs from 'fs';
import type { TemplateAnalysis, BindingMetadata } from '../types/index.js';
import { generateSourceUrl, type GitRepository, makeRelative } from './git-helpers.js';

// Dynamic import for @angular/compiler to avoid ESM/CommonJS issues
let angularCompiler: any = null;

/**
 * Load Angular compiler dynamically
 * MUST be called and awaited before using analyzeTemplate()
 */
export async function loadAngularCompiler() {
  if (!angularCompiler) {
    angularCompiler = await import('@angular/compiler');
  }
  return angularCompiler;
}

/**
 * Resolve template file path from component file
 * @param componentPath - Component file path (can be relative or absolute)
 * @param templateUrl - Template URL from component decorator
 * @param rootDir - Optional root directory to resolve relative paths
 */
export function resolveTemplatePath(componentPath: string, templateUrl: string, rootDir?: string): string {
  // If componentPath is relative and rootDir is provided, make it absolute first
  let absoluteComponentPath = componentPath;
  if (rootDir && !path.isAbsolute(componentPath)) {
    absoluteComponentPath = path.resolve(rootDir, componentPath);
  }

  const componentDir = path.dirname(absoluteComponentPath);
  return path.resolve(componentDir, templateUrl);
}

/**
 * Analyze template content (works for both inline and external)
 *
 * NOTE: loadAngularCompiler() MUST be called and awaited before using this function.
 * This is guaranteed by AngularCoreParser.parseProject() which loads the compiler
 * before parsing templates.
 */
export function analyzeTemplate(templateContent: string, filePath?: string): TemplateAnalysis {
  try {
    // Parse template with Angular compiler (guaranteed to be loaded)
    const parsed = angularCompiler.parseTemplate(templateContent, filePath || 'inline-template.html', {
      preserveWhitespaces: false,
      interpolationConfig: undefined,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.warn(`⚠️  Template parsing errors in ${filePath}:`, parsed.errors.map((e: any) => e.msg).join(', '));
    }

    const usedComponents = new Set<string>();
    const usedDirectives = new Set<string>();
    const usedPipes = new Set<string>();
    const bindings: BindingMetadata[] = [];
    const templateRefs: string[] = [];

    // Visit all nodes in the template AST
    function visitNode(node: any): void {
      // Element nodes (components and directives)
      if (node.name) {
        // Custom component selector (contains dash)
        if (node.name.includes('-')) {
          usedComponents.add(node.name);
        }

        // Structural directives
        if (node.attributes) {
          node.attributes.forEach((attr: any) => {
            if (attr.name?.startsWith('*')) {
              const directiveName = attr.name.substring(1);
              usedDirectives.add(directiveName);
            }
          });
        }

        // Attribute directives
        if (node.inputs) {
          node.inputs.forEach((input: any) => {
            // Detect directives like [ngClass], [ngStyle]
            if (input.name.startsWith('ng')) {
              usedDirectives.add(input.name);
            }

            bindings.push({
              type: 'property',
              name: input.name,
              expression: input.value?.toString(),
              line: input.sourceSpan?.start?.line ?? 0,
            });
          });
        }

        // Event bindings
        if (node.outputs) {
          node.outputs.forEach((output: any) => {
            bindings.push({
              type: 'event',
              name: output.name,
              expression: output.handler?.toString(),
              line: output.sourceSpan?.start?.line ?? 0,
            });
          });
        }

        // Template references
        if (node.references) {
          node.references.forEach((ref: any) => {
            templateRefs.push(ref.name);
          });
        }
      }

      // Visit children recursively
      if (node.children) {
        node.children.forEach((child: any) => visitNode(child));
      }
    }

    // Visit all nodes in the parsed template
    parsed.nodes.forEach((node: any) => visitNode(node));

    // Extract pipes from template content (regex fallback)
    const pipeMatches = templateContent.matchAll(/\|\s*(\w+)(?:\s|:|}})/g);
    for (const match of pipeMatches) {
      usedPipes.add(match[1]);
    }

    // Calculate complexity (simple heuristic)
    const complexity = calculateComplexity(parsed.nodes);

    return {
      usedComponents: Array.from(usedComponents).sort(),
      usedDirectives: Array.from(usedDirectives).sort(),
      usedPipes: Array.from(usedPipes).sort(),
      bindings,
      templateRefs,
      complexity,
    };
  } catch (error) {
    console.warn(`⚠️  Failed to parse template ${filePath}:`, (error as Error).message);
    return {
      usedComponents: [],
      usedDirectives: [],
      usedPipes: [],
      bindings: [],
      templateRefs: [],
    };
  }
}

/**
 * Calculate template complexity score
 */
function calculateComplexity(nodes: any[]): number {
  let score = 0;

  function visit(node: any, depth: number): void {
    score += depth; // Nesting adds to complexity

    // Structural directives add complexity
    if (node.attributes) {
      node.attributes.forEach((attr: any) => {
        if (attr.name?.startsWith('*')) {
          score += 2;
        }
      });
    }

    // Bindings add complexity
    if (node.inputs) {
      score += node.inputs.length;
    }
    if (node.outputs) {
      score += node.outputs.length;
    }

    // Visit children
    if (node.children) {
      node.children.forEach((child: any) => visit(child, depth + 1));
    }
  }

  nodes.forEach((node) => visit(node, 1));

  return score;
}

/**
 * Read template file content
 */
export function readTemplateFile(filePath: string): string | undefined {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`⚠️  Failed to read template file ${filePath}:`, (error as Error).message);
  }
  return undefined;
}

/**
 * Generate template location metadata
 */
export function generateTemplateLocation(
  componentFilePath: string,
  templateUrl: string,
  rootDir: string,
  gitInfo?: GitRepository
): { filePath: string; sourceUrl?: string; exists: boolean } {
  const templatePath = resolveTemplatePath(componentFilePath, templateUrl, rootDir);
  const exists = fs.existsSync(templatePath);

  // Use git root for relative paths if available (consistent with entity locations)
  const baseDir = gitInfo?.rootDir || rootDir;

  return {
    filePath: makeRelative(templatePath, baseDir),
    sourceUrl: gitInfo ? generateSourceUrl(templatePath, gitInfo) : undefined,
    exists,
  };
}
