/**
 * Git Remote Parser
 * Detects Git repository and enriches source locations with URLs
 */

import type { Entity } from '../../types';
import { detectGitRepository, generateSourceUrl, type GitRepository } from '../../utils/git-helpers';

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
   */
  enrichEntities(entities: Map<string, Entity>): void {
    if (!this.gitInfo) {
      return; // No git info, skip enrichment
    }

    for (const entity of entities.values()) {
      if (entity.location) {
        entity.location.sourceUrl = generateSourceUrl(
          entity.location.filePath,
          this.gitInfo,
          entity.location.line
        );
      }
    }
  }
}
