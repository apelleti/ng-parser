/**
 * Entity Resolver
 * Resolves string references to entity IDs
 */

import type { Entity, Relationship } from '../types';

/**
 * Resolves entity names to IDs and marks unresolved relationships
 */
export class EntityResolver {
  private entityNameIndex: Map<string, string>; // name -> id

  constructor(entities: Map<string, Entity>) {
    this.entityNameIndex = this.buildNameIndex(entities);
  }

  /**
   * Build index of entity names to IDs for fast lookup
   */
  private buildNameIndex(entities: Map<string, Entity>): Map<string, string> {
    const index = new Map<string, string>();

    for (const [id, entity] of entities) {
      // Index by name
      if (entity.name) {
        // Handle potential name collisions
        if (index.has(entity.name)) {
          // Multiple entities with same name - use fully qualified name later
          console.warn(
            `⚠️  Multiple entities found with name "${entity.name}". ` +
            `Resolution may be ambiguous.`
          );
        } else {
          index.set(entity.name, id);
        }
      }
    }

    return index;
  }

  /**
   * Resolve a name to an entity ID
   * Returns undefined if not found
   */
  resolveEntityId(name: string): string | undefined {
    // Direct lookup
    if (this.entityNameIndex.has(name)) {
      return this.entityNameIndex.get(name);
    }

    // Try variations (e.g., "HttpClient" -> "HttpClient")
    // Handle decorators without @ (e.g., "Component" vs "@Component")
    const withoutAt = name.replace(/^@/, '');
    if (this.entityNameIndex.has(withoutAt)) {
      return this.entityNameIndex.get(withoutAt);
    }

    // Handle module names (e.g., "@angular/common" -> "CommonModule")
    // This is a heuristic - actual resolution would need import analysis
    if (name.includes('/')) {
      const parts = name.split('/');
      const moduleName = parts[parts.length - 1];
      if (this.entityNameIndex.has(moduleName)) {
        return this.entityNameIndex.get(moduleName);
      }
    }

    return undefined;
  }

  /**
   * Resolve all relationships
   * Marks unresolved ones with metadata
   */
  resolveRelationships(relationships: Relationship[]): Relationship[] {
    const resolved: Relationship[] = [];
    const warnings: string[] = [];

    for (const rel of relationships) {
      // If target is already an ID (contains ':'), skip resolution
      if (rel.target.includes(':')) {
        resolved.push(rel);
        continue;
      }

      // Try to resolve target name to ID
      const resolvedId = this.resolveEntityId(rel.target);

      if (resolvedId) {
        // Successfully resolved
        resolved.push({
          ...rel,
          target: resolvedId,
          metadata: {
            ...rel.metadata,
            originalName: rel.target,
            resolved: true,
          },
        });
      } else {
        // Could not resolve - mark as unresolved
        const unresolvedTarget = `unresolved:${rel.target}`;
        resolved.push({
          ...rel,
          id: rel.id.replace(rel.target, unresolvedTarget),
          target: unresolvedTarget,
          metadata: {
            ...rel.metadata,
            originalName: rel.target,
            resolved: false,
          },
        });

        // Collect warning
        if (!warnings.includes(rel.target)) {
          warnings.push(rel.target);
        }
      }
    }

    // Log warnings for unresolved entities
    if (warnings.length > 0) {
      console.warn(
        `⚠️  Could not resolve ${warnings.length} entity reference(s):\n` +
        warnings.map(w => `   - ${w}`).join('\n') +
        '\n   These may be external dependencies or Angular built-ins.'
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
