/**
 * File system helper utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if a file exists (async)
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content (async)
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Find all TypeScript files in a directory (async with path traversal protection)
 */
export async function findTypeScriptFiles(
  dir: string,
  options: {
    includeTests?: boolean;
    includeNodeModules?: boolean;
    maxDepth?: number;
    followSymlinks?: boolean;
  } = {}
): Promise<string[]> {
  const files: string[] = [];
  const maxDepth = options.maxDepth ?? 20; // Sane default to prevent infinite recursion
  const followSymlinks = options.followSymlinks ?? false;
  const visitedDirs = new Set<string>(); // Prevent symlink loops
  const rootRealPath = await fs.promises.realpath(dir);

  async function traverse(currentDir: string, depth: number = 0): Promise<void> {
    // Depth limit protection
    if (depth > maxDepth) {
      console.warn(`⚠️  Max depth ${maxDepth} reached at ${currentDir} - skipping deeper traversal`);
      return;
    }

    // Symlink loop detection
    const realPath = await fs.promises.realpath(currentDir);
    if (visitedDirs.has(realPath)) {
      console.warn(`⚠️  Symlink loop detected at ${currentDir} - skipping`);
      return;
    }
    visitedDirs.add(realPath);

    // Path traversal protection - ensure we stay within root directory
    if (!realPath.startsWith(rootRealPath)) {
      console.warn(
        `⚠️  Path traversal detected: ${currentDir} resolves outside root directory - skipping`
      );
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (error: any) {
      console.warn(`⚠️  Cannot read directory ${currentDir}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules unless explicitly included
      if (!options.includeNodeModules && entry.name === 'node_modules') {
        continue;
      }

      // Skip test files unless explicitly included
      if (!options.includeTests && /\.(spec|test)\.ts$/.test(entry.name)) {
        continue;
      }

      // Skip common non-source directories
      if (entry.isDirectory() && ['.git', '.vscode', 'dist', 'coverage'].includes(entry.name)) {
        continue;
      }

      // Handle symlinks
      if (entry.isSymbolicLink()) {
        if (!followSymlinks) {
          continue; // Skip symlinks by default
        }

        // Resolve symlink and check if it's a directory or file
        try {
          const symlinkTarget = await fs.promises.realpath(fullPath);
          const symlinkStats = await fs.promises.stat(symlinkTarget);

          if (symlinkStats.isDirectory()) {
            await traverse(fullPath, depth + 1);
          } else if (symlinkStats.isFile() && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        } catch (error: any) {
          console.warn(`⚠️  Cannot resolve symlink ${fullPath}: ${error.message}`);
        }
        continue;
      }

      if (entry.isDirectory()) {
        await traverse(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

/**
 * Find tsconfig.json in a directory (async)
 */
export async function findTsConfig(dir: string): Promise<string | undefined> {
  const configPath = path.join(dir, 'tsconfig.json');
  if (await fileExists(configPath)) {
    return configPath;
  }

  // Try parent directory
  const parentDir = path.dirname(dir);
  if (parentDir !== dir) {
    return findTsConfig(parentDir);
  }

  return undefined;
}

/**
 * Normalize file path
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get relative path from base directory
 */
export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(from, to));
}

/**
 * Resolve absolute path
 */
export function resolvePath(...paths: string[]): string {
  return normalizePath(path.resolve(...paths));
}

// === LEGACY SYNC VERSIONS (deprecated) ===

/**
 * @deprecated Use fileExists() instead (async version)
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * @deprecated Use readFile() instead (async version)
 */
export function readFileSync(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * @deprecated Use findTypeScriptFiles() instead (async version)
 */
export function findTypeScriptFilesSync(
  dir: string,
  options: {
    includeTests?: boolean;
    includeNodeModules?: boolean;
    maxDepth?: number;
  } = {}
): string[] {
  const files: string[] = [];
  const maxDepth = options.maxDepth ?? Infinity;

  function traverse(currentDir: string, depth: number = 0) {
    if (depth > maxDepth) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (!options.includeNodeModules && entry.name === 'node_modules') {
        continue;
      }

      if (!options.includeTests && /\.(spec|test)\.ts$/.test(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}
