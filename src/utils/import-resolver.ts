/**
 * TypeScript import resolution using native ts.resolveModuleName
 * Handles tsconfig.json paths, baseUrl, and node_modules resolution
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { isExternalPackage, extractPackageName, type PackageInfo } from './package-helpers.js';

/**
 * Result of import resolution
 */
export interface ImportResolution {
  importPath: string;           // Original import path
  resolvedPath?: string;        // Resolved absolute file path
  isExternal: boolean;          // true if npm package, false if internal
  exists: boolean;              // File exists on disk
  packageName?: string;         // Package name for external imports
}

/**
 * Import resolver using TypeScript's native resolution
 */
export class ImportResolver {
  private compilerOptions: ts.CompilerOptions;
  private cache: Map<string, ImportResolution>;

  constructor(
    private program: ts.Program,
    private rootDir: string,
    private packageInfo: PackageInfo | null
  ) {
    this.compilerOptions = program.getCompilerOptions();
    this.cache = new Map();
  }

  /**
   * Resolve an import path according to tsconfig.json
   *
   * This uses TypeScript's native resolution which handles:
   * - Relative paths (./foo, ../bar)
   * - Absolute paths configured in tsconfig paths (@app/*, @shared/*)
   * - node_modules resolution
   *
   * @param importPath - Import path from the source code
   * @param sourceFile - Source file containing the import
   * @returns Resolution information
   */
  resolveImport(importPath: string, sourceFile: ts.SourceFile): ImportResolution {
    const cacheKey = `${sourceFile.fileName}:${importPath}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let resolution: ImportResolution;

    // 1. Relative import (./xxx, ../xxx) -> always internal
    if (importPath.startsWith('.')) {
      resolution = this.resolveRelativeImport(importPath, sourceFile);
    }
    // 2. Use TypeScript's native resolution (handles tsconfig paths)
    else {
      resolution = this.resolveAbsoluteImport(importPath, sourceFile);
    }

    // Cache result
    this.cache.set(cacheKey, resolution);

    return resolution;
  }

  /**
   * Resolve relative import (./service, ../module)
   */
  private resolveRelativeImport(
    importPath: string,
    sourceFile: ts.SourceFile
  ): ImportResolution {
    const sourceDir = path.dirname(sourceFile.fileName);
    const resolvedPath = path.resolve(sourceDir, importPath);

    // Try common extensions
    const exists =
      fs.existsSync(resolvedPath + '.ts') ||
      fs.existsSync(resolvedPath + '.tsx') ||
      fs.existsSync(resolvedPath + '.js') ||
      fs.existsSync(resolvedPath + '.jsx') ||
      fs.existsSync(path.join(resolvedPath, 'index.ts')) ||
      fs.existsSync(path.join(resolvedPath, 'index.js'));

    return {
      importPath,
      resolvedPath: exists ? resolvedPath : undefined,
      isExternal: false,
      exists,
    };
  }

  /**
   * Resolve absolute import using TypeScript's resolution
   * Handles tsconfig paths and node_modules
   */
  private resolveAbsoluteImport(
    importPath: string,
    sourceFile: ts.SourceFile
  ): ImportResolution {
    // Use TypeScript's native module resolution
    const resolved = ts.resolveModuleName(
      importPath,
      sourceFile.fileName,
      this.compilerOptions,
      ts.sys
    );

    if (resolved.resolvedModule) {
      const resolvedPath = resolved.resolvedModule.resolvedFileName;

      // Check if resolved to node_modules -> external
      const isExternal = resolvedPath.includes('node_modules');

      return {
        importPath,
        resolvedPath,
        isExternal,
        exists: true,
        packageName: isExternal ? extractPackageName(importPath) : undefined,
      };
    }

    // TypeScript couldn't resolve, fallback to package.json check
    if (isExternalPackage(importPath, this.packageInfo)) {
      return {
        importPath,
        isExternal: true,
        exists: false, // Can't verify without resolution
        packageName: extractPackageName(importPath),
      };
    }

    // Could not resolve at all
    return {
      importPath,
      isExternal: false,
      exists: false,
    };
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number } {
    return {
      size: this.cache.size,
      hits: 0, // Could track this if needed
    };
  }
}
