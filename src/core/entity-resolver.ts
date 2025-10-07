/**
 * Entity Resolver
 * Resolves string references to entity IDs and classifies dependencies
 */

import * as ts from 'typescript';
import type { Entity, Relationship } from '../types/index.js';
import { ImportResolver } from '../utils/import-resolver.js';
import { extractPackageName, getDependencyVersion, type PackageInfo } from '../utils/package-helpers.js';

/**
 * Resolves entity names to IDs and classifies relationships (internal vs external)
 */
export class EntityResolver {
  private entityNameIndex: Map<string, string[]>; // name -> [id1, id2, ...]
  private entityMap: Map<string, Entity>; // id -> entity (for context-based resolution)
  private importResolver: ImportResolver;
  private packageInfo: PackageInfo | null;

  constructor(
    entities: Map<string, Entity>,
    program: ts.Program,
    rootDir: string,
    packageInfo: PackageInfo | null
  ) {
    this.entityMap = entities;
    this.entityNameIndex = this.buildNameIndex(entities);
    this.importResolver = new ImportResolver(program, rootDir, packageInfo);
    this.packageInfo = packageInfo;
  }

  /**
   * Build index of entity names to IDs for fast lookup
   * Supports multiple entities with the same name (e.g., in monorepo)
   */
  private buildNameIndex(entities: Map<string, Entity>): Map<string, string[]> {
    const index = new Map<string, string[]>();

    for (const [id, entity] of entities) {
      // Index by name
      if (entity.name) {
        const existing = index.get(entity.name) || [];
        existing.push(id);
        index.set(entity.name, existing);
      }
    }

    // Log duplicate names for awareness
    for (const [name, ids] of index) {
      if (ids.length > 1) {
        console.log(
          `📋 Found ${ids.length} entities named "${name}" (monorepo/multi-app structure)`
        );
      }
    }

    return index;
  }

  /**
   * Resolve a name to an entity ID with context-based disambiguation
   *
   * @param name - Entity name to resolve
   * @param context - Optional context for disambiguation
   * @param context.sourceFile - Source file where the reference is made
   * @param context.importPath - Import path if available
   * @returns Entity ID or undefined if not found
   */
  resolveEntityId(
    name: string,
    context?: {
      sourceFile?: ts.SourceFile;
      importPath?: string;
    }
  ): string | undefined {
    // Direct lookup
    const candidates = this.entityNameIndex.get(name);

    if (candidates) {
      if (candidates.length === 1) {
        // Single match - easy case
        return candidates[0];
      }

      // Multiple matches - disambiguate using context
      if (context) {
        const disambiguated = this.disambiguate(name, candidates, context);
        if (disambiguated) {
          return disambiguated;
        }
      }

      // No context or disambiguation failed - return first match with warning
      console.warn(
        `⚠️  Ambiguous reference to "${name}" (${candidates.length} matches). ` +
        `Using first match. Consider providing import path context.`
      );
      return candidates[0];
    }

    // Try variations (e.g., "HttpClient" -> "HttpClient")
    // Handle decorators without @ (e.g., "Component" vs "@Component")
    const withoutAt = name.replace(/^@/, '');
    if (withoutAt !== name) {
      const withoutAtCandidates = this.entityNameIndex.get(withoutAt);
      if (withoutAtCandidates) {
        if (withoutAtCandidates.length === 1) {
          return withoutAtCandidates[0];
        }
        if (context) {
          return this.disambiguate(withoutAt, withoutAtCandidates, context);
        }
        return withoutAtCandidates[0];
      }
    }

    // Handle module names (e.g., "@angular/common" -> "CommonModule")
    // This is a heuristic - actual resolution would need import analysis
    if (name.includes('/')) {
      const parts = name.split('/');
      const moduleName = parts[parts.length - 1];
      const moduleNameCandidates = this.entityNameIndex.get(moduleName);
      if (moduleNameCandidates) {
        if (moduleNameCandidates.length === 1) {
          return moduleNameCandidates[0];
        }
        if (context) {
          return this.disambiguate(moduleName, moduleNameCandidates, context);
        }
        return moduleNameCandidates[0];
      }
    }

    return undefined;
  }

  /**
   * Disambiguate between multiple entities with the same name using context
   */
  private disambiguate(
    name: string,
    candidates: string[],
    context: {
      sourceFile?: ts.SourceFile;
      importPath?: string;
    }
  ): string | undefined {
    const { sourceFile, importPath } = context;

    // Strategy 1: Use import path to find exact match
    if (importPath) {
      for (const candidateId of candidates) {
        const entity = this.entityMap.get(candidateId);
        if (!entity) continue;

        // Check if entity's file path matches the import path
        const entityPath = entity.location.filePath;

        // Normalize paths for comparison
        const normalizedImport = importPath.replace(/\\/g, '/');
        const normalizedEntity = entityPath.replace(/\\/g, '/');

        if (normalizedEntity.includes(normalizedImport) ||
            normalizedImport.includes(normalizedEntity)) {
          return candidateId;
        }
      }
    }

    // Strategy 2: Use source file location to find closest match
    if (sourceFile) {
      const sourceDir = sourceFile.fileName.replace(/\\/g, '/').split('/').slice(0, -1).join('/');

      // Find candidate with most path overlap
      let bestMatch: string | undefined;
      let maxOverlap = 0;

      for (const candidateId of candidates) {
        const entity = this.entityMap.get(candidateId);
        if (!entity) continue;

        const entityDir = entity.location.filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        const overlap = this.calculatePathOverlap(sourceDir, entityDir);

        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestMatch = candidateId;
        }
      }

      if (bestMatch && maxOverlap > 0) {
        return bestMatch;
      }
    }

    return undefined;
  }

  /**
   * Calculate directory path overlap between two paths
   */
  private calculatePathOverlap(path1: string, path2: string): number {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');

    let overlap = 0;
    const minLength = Math.min(parts1.length, parts2.length);

    for (let i = 0; i < minLength; i++) {
      if (parts1[i] === parts2[i]) {
        overlap++;
      } else {
        break;
      }
    }

    return overlap;
  }

  /**
   * Resolve all relationships and classify them (internal vs external)
   *
   * @param relationships - Raw relationships from parsers
   * @param sourceFileMap - Map of entity ID to source file (for import resolution)
   * @returns Resolved and classified relationships
   */
  resolveRelationships(
    relationships: Relationship[],
    sourceFileMap: Map<string, ts.SourceFile>
  ): Relationship[] {
    const resolved: Relationship[] = [];
    const externalCount = { external: 0, unresolved: 0 };

    for (const rel of relationships) {
      // Skip if target is not a string
      if (typeof rel.target !== 'string') {
        console.warn(`⚠️  Skipping relationship with non-string target:`, rel);
        continue;
      }

      // If target is already an ID (contains ':'), validate and potentially reclassify
      if (rel.target.includes(':')) {
        // Check if it's an "internal" relationship but target doesn't exist
        if (rel.metadata?.classification === 'internal' && !this.entityMap.has(rel.target)) {
          // Reclassify as unresolved since the target entity doesn't exist
          externalCount.unresolved++;
          resolved.push({
            ...rel,
            metadata: {
              ...rel.metadata,
              classification: 'unresolved',
              resolved: false,
            },
          });
        } else {
          // Target exists or is already classified correctly
          resolved.push(rel);
        }
        continue;
      }

      // 1️⃣ Try to resolve as internal entity with context
      const sourceFile = sourceFileMap.get(rel.source);
      const importPath = rel.metadata?.importPath;

      const resolvedId = this.resolveEntityId(rel.target, {
        sourceFile,
        importPath,
      });

      if (resolvedId) {
        // Successfully resolved to internal entity
        resolved.push({
          ...rel,
          target: resolvedId,
          metadata: {
            ...rel.metadata,
            originalName: rel.target,
            classification: 'internal',
            resolved: true,
          },
        });
        continue;
      }

      // 2️⃣ Try to classify using import path + TypeScript resolution
      if (importPath && sourceFile) {
        const resolution = this.importResolver.resolveImport(importPath, sourceFile);

        if (resolution.isExternal) {
          // External dependency (npm package)
          externalCount.external++;
          const packageName = resolution.packageName || extractPackageName(importPath);
          const version = getDependencyVersion(packageName, this.packageInfo);
          resolved.push({
            ...rel,
            target: `external:${importPath}:${rel.target}`,
            metadata: {
              ...rel.metadata,
              originalName: rel.target,
              classification: 'external',
              packageName,
              version,
              resolvedPath: resolution.resolvedPath,
              resolved: true,
            },
          });
          continue;
        } else if (resolution.exists) {
          // Internal file but entity not found (e.g., not parsed, interface, etc.)
          resolved.push({
            ...rel,
            target: `internal-file:${importPath}:${rel.target}`,
            metadata: {
              ...rel.metadata,
              originalName: rel.target,
              classification: 'internal',
              resolvedPath: resolution.resolvedPath,
              resolved: false,
            },
          });
          continue;
        }
      }

      // 3️⃣ Could not resolve at all
      externalCount.unresolved++;
      resolved.push({
        ...rel,
        target: `unresolved:${rel.target}`,
        metadata: {
          ...rel.metadata,
          originalName: rel.target,
          classification: 'unresolved',
          resolved: false,
        },
      });
    }

    // Log resolution statistics
    if (externalCount.external > 0 || externalCount.unresolved > 0) {
      console.log(
        `📦 Dependency classification:\n` +
        `   - External packages: ${externalCount.external}\n` +
        `   - Unresolved: ${externalCount.unresolved}`
      );
    }

    return resolved;
  }

  /**
   * Get statistics about resolution
   */
  getStats(relationships: Relationship[]): {
    total: number;
    resolved: number;
    unresolved: number;
    unresolvedNames: string[];
  } {
    const unresolvedNames = new Set<string>();

    for (const rel of relationships) {
      if (rel.target.startsWith('unresolved:')) {
        unresolvedNames.add(rel.target.replace('unresolved:', ''));
      }
    }

    const resolved = relationships.filter(r => !r.target.startsWith('unresolved:')).length;

    return {
      total: relationships.length,
      resolved,
      unresolved: unresolvedNames.size,
      unresolvedNames: Array.from(unresolvedNames),
    };
  }
}
