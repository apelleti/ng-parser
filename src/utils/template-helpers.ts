/**
 * Template helper utilities
 * Parse and analyze Angular HTML templates
 */

import * as path from 'path';
import * as fs from 'fs';
import type { TemplateAnalysis, BindingMetadata } from '../types/index.js';
import {
  generateSourceUrl,
  type GitRepository,
  makeRelative,
  getBaseDir,
  generateLocationMetadata,
} from './git-helpers.js';
import { inputAttributeRegistry } from './input-attribute-registry.js';

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
 * Clean expression by removing Angular compiler debug metadata
 * Example: "containerId in /path/to/file@3:17" -> "containerId"
 */
function cleanExpression(expression?: string): string | undefined {
  if (!expression) return undefined;

  // Remove " in <filepath>@<position>" suffix added by Angular compiler
  const cleanedExpression = expression.replace(/\s+in\s+[^\s]+@\d+:\d+$/, '');

  return cleanedExpression || undefined;
}

/**
 * Analyze template content (works for both inline and external)
 *
 * NOTE: loadAngularCompiler() MUST be called and awaited before using this function.
 * This is guaranteed by AngularCoreParser.parseProject() which loads the compiler
 * before parsing templates.
 */
export function analyzeTemplate(
  templateContent: string,
  filePath?: string,
  gitInfo?: GitRepository
): TemplateAnalysis {
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

    // HTML standard attributes to ignore (not Angular directives)
    const htmlStandardAttrs = new Set([
      'id', 'class', 'style', 'title', 'lang', 'dir', 'hidden',
      'tabindex', 'accesskey', 'contenteditable', 'draggable', 'spellcheck',
      'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
      'aria-expanded', 'aria-selected', 'aria-checked', 'aria-disabled',
      'href', 'src', 'alt', 'width', 'height', 'type', 'value', 'name',
      'placeholder', 'disabled', 'readonly', 'required', 'checked', 'selected',
      'multiple', 'min', 'max', 'step', 'pattern', 'autocomplete', 'autofocus',
      'for', 'action', 'method', 'target', 'rel', 'download',
      'colspan', 'rowspan', 'headers', 'scope',
    ]);

    // Visit all nodes in the template AST
    function visitNode(node: any): void {
      // Element nodes (components and directives)
      if (node.name) {
        // Custom component selector (contains dash)
        if (node.name.includes('-')) {
          usedComponents.add(node.name);
        }

        // Structural directives (*ngIf, *ngFor, etc.)
        if (node.attributes) {
          node.attributes.forEach((attr: any) => {
            if (attr.name?.startsWith('*')) {
              const directiveName = attr.name.substring(1);
              usedDirectives.add(directiveName);
            }
            // Regular attributes that might be Angular directives
            // Filter out standard HTML attributes, CSS classes (contain --), and @Input attributes
            else if (attr.name &&
                     !attr.name.includes(':') &&
                     !attr.name.startsWith('(') &&
                     !attr.name.startsWith('[') &&
                     !attr.name.includes('--') && // CSS classes like mdc-text-field--disabled
                     !htmlStandardAttrs.has(attr.name.toLowerCase()) &&
                     !attr.name.startsWith('aria-') &&
                     !attr.name.startsWith('data-') &&
                     !inputAttributeRegistry.isInputAttribute(attr.name)) { // Filter @Input attributes
              usedDirectives.add(attr.name);
            }
          });
        }

        // Attribute directives from property bindings
        if (node.inputs) {
          node.inputs.forEach((input: any) => {
            // Filter out standard property bindings (class.*, style.*, attr.*) and @Input attributes
            if (!input.name.startsWith('class.') &&
                !input.name.startsWith('style.') &&
                !input.name.startsWith('attr.') &&
                !htmlStandardAttrs.has(input.name.toLowerCase()) &&
                !inputAttributeRegistry.isInputAttribute(input.name)) { // Filter @Input attributes
              usedDirectives.add(input.name);
            }

            const lineNumber = input.sourceSpan?.start?.line ?? 0;
            const sourceUrl = filePath ? generateSourceUrl(filePath, gitInfo, lineNumber) : undefined;

            bindings.push({
              type: 'property',
              name: input.name,
              expression: cleanExpression(input.value?.toString()),
              line: lineNumber,
              sourceUrl,
            });
          });
        }

        // Event bindings
        if (node.outputs) {
          node.outputs.forEach((output: any) => {
            const lineNumber = output.sourceSpan?.start?.line ?? 0;
            const sourceUrl = filePath ? generateSourceUrl(filePath, gitInfo, lineNumber) : undefined;

            bindings.push({
              type: 'event',
              name: output.name,
              expression: cleanExpression(output.handler?.toString()),
              line: lineNumber,
              sourceUrl,
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
  const location = generateLocationMetadata(templatePath, rootDir, gitInfo, exists);

  return {
    ...location,
    exists, // Ensure exists is always present (not optional)
  };
}
