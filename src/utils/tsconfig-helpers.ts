/**
 * TypeScript configuration parsing utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TypeScriptConfig } from '../types/index.js';

/**
 * Load and parse tsconfig.json from project root
 *
 * @param rootDir - Project root directory
 * @returns Parsed TypeScript configuration or null if not found
 */
export function loadTsConfig(rootDir: string): TypeScriptConfig | null {
  try {
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      return null;
    }

    const content = fs.readFileSync(tsconfigPath, 'utf8');
    // Remove comments (simple approach, doesn't handle all edge cases)
    const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(jsonContent);

    const compilerOptions = parsed.compilerOptions || {};

    return {
      target: compilerOptions.target,
      module: compilerOptions.module,
      strict: compilerOptions.strict,
      experimentalDecorators: compilerOptions.experimentalDecorators,
      emitDecoratorMetadata: compilerOptions.emitDecoratorMetadata,
      paths: compilerOptions.paths,
      baseUrl: compilerOptions.baseUrl,
    };
  } catch (error) {
    console.warn(`⚠️  Failed to parse tsconfig.json: ${error}`);
    return null;
  }
}

/**
 * Check if TypeScript configuration has Angular decorators enabled
 *
 * @param config - TypeScript configuration
 * @returns true if decorators are enabled
 */
export function hasAngularDecorators(config: TypeScriptConfig | null): boolean {
  return !!(config?.experimentalDecorators && config?.emitDecoratorMetadata);
}

/**
 * Get path aliases from TypeScript configuration
 *
 * @param config - TypeScript configuration
 * @returns Map of alias to paths
 */
export function getPathAliases(config: TypeScriptConfig | null): Map<string, string[]> {
  const aliases = new Map<string, string[]>();

  if (!config?.paths) {
    return aliases;
  }

  for (const [alias, paths] of Object.entries(config.paths)) {
    aliases.set(alias, paths);
  }

  return aliases;
}

/**
 * Check if an import path matches a TypeScript path alias
 *
 * @param importPath - Import path to check
 * @param config - TypeScript configuration
 * @returns true if the import matches an alias
 */
export function isPathAlias(importPath: string, config: TypeScriptConfig | null): boolean {
  if (!config?.paths) {
    return false;
  }

  for (const alias of Object.keys(config.paths)) {
    // Remove trailing /* from alias for comparison
    const aliasPrefix = alias.replace(/\/\*$/, '');
    const importPrefix = importPath.replace(/\/\*$/, '');

    if (importPrefix.startsWith(aliasPrefix)) {
      return true;
    }
  }

  return false;
}
