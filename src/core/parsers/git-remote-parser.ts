/**
 * Git Remote Parser
 * Detects Git repository and enriches source locations with URLs
 */

import * as path from 'path';
import type { Entity } from '../../types/index.js';
import { detectGitRepository, generateSourceUrl, type GitRepository } from '../../utils/git-helpers.js';

/**
 * Git Remote Parser
 * Enriches all entity locations with source URLs (GitHub, GitLab, Bitbucket, Azure)
 */
export class GitRemoteParser {
  private gitInfo?: GitRepository;

  /**
   * Detect Git repository information
   */
  async detectRepository(rootDir: string): Promise<GitRepository | undefined> {
    this.gitInfo = await detectGitRepository(rootDir);
    return this.gitInfo;
  }

  /**
   * Get detected Git repository info
   */
  getGitInfo(): GitRepository | undefined {
    return this.gitInfo;
  }

  /**
   * Enrich entities with source URLs
   * Note: filePath is now already relative to git root, no need to resolve
   */
  enrichEntities(entities: Map<string, Entity>, gitInfo?: GitRepository): void {
    const repoInfo = gitInfo || this.gitInfo;
    if (!repoInfo) {
      return; // No git info, skip enrichment
    }

    for (const entity of entities.values()) {
      if (entity.location) {
        // Build absolute path from relative filePath
        const absolutePath = path.resolve(repoInfo.rootDir, entity.location.filePath);

        entity.location.sourceUrl = generateSourceUrl(
          absolutePath,
          repoInfo,
          entity.location.line
        );
      }
    }
  }
}
