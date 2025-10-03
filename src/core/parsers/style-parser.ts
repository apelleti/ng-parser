/**
 * Style Parser
 * Parses SCSS files for @import and @use statements
 */

import type { ComponentEntity, StyleLocation, StyleAnalysis, StyleFileMetadata } from '../../types/index.js';
import type { GitRepository } from '../../utils/git-helpers.js';
import { resolveEntityPath } from '../../utils/git-helpers.js';
import {
  parseScssFile,
  resolveStylePath,
  generateStyleLocations,
} from '../../utils/style-helpers.js';

/**
 * Style Parser
 * Analyzes SCSS files to extract @import and @use statements
 */
export class StyleParser {
  /**
   * Parse styles for a component
   */
  parseStyles(
    entity: ComponentEntity,
    rootDir: string,
    gitInfo?: GitRepository
  ): { styleLocations?: StyleLocation[]; styleAnalysis?: StyleAnalysis } {
    // No styles to parse
    if (!entity.styleUrls || entity.styleUrls.length === 0) {
      return {};
    }

    // entity.location.filePath is relative to git root (if git detected)
    // We need to construct absolute path for resolveStylePath()
    const absoluteComponentPath = resolveEntityPath(entity.location.filePath, rootDir, gitInfo);
    const baseDir = gitInfo?.rootDir || rootDir;

    // Generate style locations metadata
    const styleLocations = generateStyleLocations(
      absoluteComponentPath,
      entity.styleUrls,
      baseDir,
      gitInfo
    );

    // Parse each style file
    const files: StyleFileMetadata[] = [];

    for (const styleUrl of entity.styleUrls) {
      const stylePath = resolveStylePath(absoluteComponentPath, styleUrl, baseDir);
      const fileMetadata = parseScssFile(stylePath, baseDir, gitInfo);
      files.push(fileMetadata);
    }

    const styleAnalysis: StyleAnalysis = {
      files,
    };

    return {
      styleLocations,
      styleAnalysis,
    };
  }

  /**
   * Find all @import statements in a component's styles
   */
  getAllImports(analysis: StyleAnalysis): Array<{ file: string; import: string }> {
    const imports: Array<{ file: string; import: string }> = [];

    for (const file of analysis.files) {
      for (const imp of file.imports) {
        imports.push({
          file: file.filePath,
          import: imp.path,
        });
      }
    }

    return imports;
  }

  /**
   * Find all @use statements in a component's styles
   */
  getAllUses(analysis: StyleAnalysis): Array<{ file: string; use: string; namespace?: string }> {
    const uses: Array<{ file: string; use: string; namespace?: string }> = [];

    for (const file of analysis.files) {
      for (const use of file.uses) {
        uses.push({
          file: file.filePath,
          use: use.path,
          namespace: use.namespace,
        });
      }
    }

    return uses;
  }
}
