/**
 * Package.json parsing and npm dependency utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Parsed package.json information
 */
export interface PackageInfo {
  name?: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

/**
 * Load and parse package.json from project root
 */
export function loadPackageJson(rootDir: string): PackageInfo | null {
  try {
    const packagePath = path.join(rootDir, 'package.json');

    if (!fs.existsSync(packagePath)) {
      return null;
    }

    const content = fs.readFileSync(packagePath, 'utf8');
    const parsed = JSON.parse(content);

    return {
      name: parsed.name,
      version: parsed.version,
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
      peerDependencies: parsed.peerDependencies || {},
    };
  } catch (error) {
    console.warn(`⚠️  Failed to parse package.json: ${error}`);
    return null;
  }
}

/**
 * Check if an import path is an external package (from package.json)
 *
 * @param importPath - Import path like "@angular/core" or "lodash"
 * @param packageInfo - Parsed package.json
 * @returns true if the package is in dependencies/devDependencies/peerDependencies
 */
export function isExternalPackage(
  importPath: string,
  packageInfo: PackageInfo | null
): boolean {
  if (!packageInfo) {
    return false;
  }

  const packageName = extractPackageName(importPath);

  return !!(
    packageInfo.dependencies[packageName] ||
    packageInfo.devDependencies[packageName] ||
    packageInfo.peerDependencies[packageName]
  );
}

/**
 * Extract the package name from an import path
 *
 * @param importPath - Import path like "@angular/core/testing" or "lodash/debounce"
 * @returns Package name like "@angular/core" or "lodash"
 *
 * @example
 * extractPackageName("@angular/core") // "@angular/core"
 * extractPackageName("@angular/core/testing") // "@angular/core"
 * extractPackageName("lodash") // "lodash"
 * extractPackageName("lodash/debounce") // "lodash"
 */
export function extractPackageName(importPath: string): string {
  // Scoped package (@angular/core, @ngrx/store)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    // @angular/core/testing -> @angular/core
    return parts.slice(0, 2).join('/');
  }

  // Regular package (lodash, rxjs)
  const parts = importPath.split('/');
  // lodash/debounce -> lodash
  return parts[0];
}

/**
 * Get all external dependencies from package.json
 */
export function getAllDependencies(packageInfo: PackageInfo | null): string[] {
  if (!packageInfo) {
    return [];
  }

  return [
    ...Object.keys(packageInfo.dependencies),
    ...Object.keys(packageInfo.devDependencies),
    ...Object.keys(packageInfo.peerDependencies),
  ];
}

/**
 * Get dependency version for a given package name
 *
 * @param packageName - Package name (e.g., "@angular/core")
 * @param packageInfo - Parsed package.json
 * @returns Version string or undefined if not found
 */
export function getDependencyVersion(
  packageName: string,
  packageInfo: PackageInfo | null
): string | undefined {
  if (!packageInfo) {
    return undefined;
  }

  return (
    packageInfo.dependencies[packageName] ||
    packageInfo.devDependencies[packageName] ||
    packageInfo.peerDependencies[packageName]
  );
}

/**
 * Get DependencyInfo for graph metadata
 *
 * @param packageInfo - Parsed package.json
 * @param totalExternal - Number of external imports detected in the code
 * @returns DependencyInfo object
 */
export function getDependencyInfo(
  packageInfo: PackageInfo | null,
  totalExternal: number
): import('../types/index.js').DependencyInfo | undefined {
  if (!packageInfo) {
    return undefined;
  }

  return {
    dependencies: packageInfo.dependencies,
    devDependencies: packageInfo.devDependencies,
    peerDependencies: packageInfo.peerDependencies,
    totalExternal,
  };
}
