/**
 * Style helper utilities
 * Parse and analyze SCSS files for @import and @use statements
 */

import * as path from 'path';
import * as fs from 'fs';
import type { StyleLocation, StyleFileMetadata, ScssImportMetadata, ScssUseMetadata } from '../types/index.js';
import {
  generateSourceUrl,
  type GitRepository,
  makeRelative,
  getBaseDir,
  generateLocationMetadata,
} from './git-helpers.js';

/**
 * Resolve style file path from component file
 * @param componentPath - Component file path (can be relative or absolute)
 * @param styleUrl - Style URL from component decorator
 * @param rootDir - Optional root directory to resolve relative paths
 */
export function resolveStylePath(componentPath: string, styleUrl: string, rootDir?: string): string {
  // If componentPath is relative and rootDir is provided, make it absolute first
  let absoluteComponentPath = componentPath;
  if (rootDir && !path.isAbsolute(componentPath)) {
    absoluteComponentPath = path.resolve(rootDir, componentPath);
  }

  const componentDir = path.dirname(absoluteComponentPath);
  const resolvedPath = path.resolve(componentDir, styleUrl);

  // If .css file doesn't exist, try .scss (Angular Material uses styleUrl: 'file.css' but has file.scss)
  if (styleUrl.endsWith('.css') && !fs.existsSync(resolvedPath)) {
    const scssPath = resolvedPath.replace(/\.css$/, '.scss');
    if (fs.existsSync(scssPath)) {
      return scssPath;
    }
  }

  return resolvedPath;
}

/**
 * Parse SCSS file for @import and @use statements
 */
export function parseScssFile(filePath: string, rootDir: string, gitInfo?: GitRepository): StyleFileMetadata {
  let content = '';

  try {
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`⚠️  Failed to read style file ${filePath}:`, (error as Error).message);
  }

  const imports = parseScssImports(content, filePath, gitInfo);
  const uses = parseScssUses(content, filePath, gitInfo);
  const location = generateLocationMetadata(filePath, rootDir, gitInfo);

  return {
    filePath: location.filePath,
    sourceUrl: location.sourceUrl,
    imports,
    uses,
  };
}

/**
 * Parse @import statements from SCSS content
 */
export function parseScssImports(content: string, filePath: string, gitInfo?: GitRepository): ScssImportMetadata[] {
  const imports: ScssImportMetadata[] = [];

  // Regex to match @import statements
  // Matches: @import 'path', @import "path", @import 'path1', 'path2'
  const importRegex = /@import\s+(['"])([^'"]+)\1/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[2];
    const statement = match[0];
    const line = getLineNumber(content, match.index);
    const sourceUrl = generateSourceUrl(filePath, gitInfo, line);

    imports.push({
      path: importPath,
      statement,
      resolvedPath: tryResolveScssPath(filePath, importPath),
      line,
      sourceUrl,
    });
  }

  return imports;
}

/**
 * Parse @use statements from SCSS content
 */
export function parseScssUses(content: string, filePath: string, gitInfo?: GitRepository): ScssUseMetadata[] {
  const uses: ScssUseMetadata[] = [];

  // Regex to match @use statements
  // Matches: @use 'path', @use 'path' as namespace, @use 'path' as *
  const useRegex = /@use\s+(['"])([^'"]+)\1(?:\s+as\s+(\w+|\*))?/g;

  let match: RegExpExecArray | null;
  while ((match = useRegex.exec(content)) !== null) {
    const usePath = match[2];
    const namespace = match[3];
    const statement = match[0];
    const line = getLineNumber(content, match.index);
    const sourceUrl = generateSourceUrl(filePath, gitInfo, line);

    uses.push({
      path: usePath,
      statement,
      namespace,
      resolvedPath: tryResolveScssPath(filePath, usePath),
      line,
      sourceUrl,
    });
  }

  return uses;
}

/**
 * Try to resolve SCSS import/use path
 */
export function tryResolveScssPath(fromFile: string, importPath: string): string | undefined {
  // Skip Sass built-ins
  if (importPath.startsWith('sass:')) {
    return undefined;
  }

  const dir = path.dirname(fromFile);

  // Try different variations
  const variations = [
    importPath,
    `${importPath}.scss`,
    `${importPath}.sass`,
    `_${importPath}.scss`,
    `_${importPath}.sass`,
    path.join(importPath, 'index.scss'),
    path.join(importPath, '_index.scss'),
  ];

  for (const variation of variations) {
    const resolved = path.resolve(dir, variation);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return undefined; // Could not resolve
}

/**
 * Get line number from character index in string
 */
export function getLineNumber(content: string, index: number): number {
  const lines = content.substring(0, index).split('\n');
  return lines.length;
}

/**
 * Generate style location metadata
 */
export function generateStyleLocation(
  componentFilePath: string,
  styleUrl: string,
  rootDir: string,
  gitInfo?: GitRepository
): StyleLocation {
  const stylePath = resolveStylePath(componentFilePath, styleUrl, rootDir);
  const exists = fs.existsSync(stylePath);
  const location = generateLocationMetadata(stylePath, rootDir, gitInfo, exists);

  return {
    originalPath: styleUrl,
    ...location,
    exists, // Ensure exists is always present (not optional)
  };
}

/**
 * Generate style locations for all styleUrls
 */
export function generateStyleLocations(
  componentFilePath: string,
  styleUrls: string[],
  rootDir: string,
  gitInfo?: GitRepository
): StyleLocation[] {
  return styleUrls.map((styleUrl) =>
    generateStyleLocation(componentFilePath, styleUrl, rootDir, gitInfo)
  );
}
