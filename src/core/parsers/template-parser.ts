/**
 * Template Parser
 * Parses Angular HTML templates (inline and external)
 */

import type { ComponentEntity, TemplateLocation, TemplateAnalysis } from '../../types/index.js';
import type { GitRepository } from '../../utils/git-helpers.js';
import { resolveEntityPath } from '../../utils/git-helpers.js';
import {
  analyzeTemplate,
  readTemplateFile,
  resolveTemplatePath,
  generateTemplateLocation,
} from '../../utils/template-helpers.js';

/**
 * Template Parser
 * Analyzes HTML templates to extract components, directives, pipes used
 */
export class TemplateParser {
  /**
   * Parse template for a component (inline or external)
   */
  parseTemplate(
    entity: ComponentEntity,
    rootDir: string,
    gitInfo?: GitRepository
  ): { templateLocation?: TemplateLocation; templateAnalysis?: TemplateAnalysis } {
    let templateContent: string | undefined;
    let templateLocation: TemplateLocation | undefined;

    // entity.location.filePath is relative to git root (if git detected)
    // We need to construct absolute path for resolveTemplatePath()
    const absoluteComponentPath = resolveEntityPath(entity.location.filePath, rootDir, gitInfo);
    const baseDir = gitInfo?.rootDir || rootDir;

    // Case 1: Inline template
    if (entity.template) {
      templateContent = entity.template;
      templateLocation = undefined; // No external file
    }
    // Case 2: External template
    else if (entity.templateUrl) {
      // Generate template location metadata
      templateLocation = generateTemplateLocation(
        absoluteComponentPath,
        entity.templateUrl,
        baseDir,
        gitInfo
      );

      // Read template content if file exists
      if (templateLocation.exists) {
        const templatePath = resolveTemplatePath(absoluteComponentPath, entity.templateUrl, baseDir);
        templateContent = readTemplateFile(templatePath);
      }
    }

    // Analyze template content
    let templateAnalysis: TemplateAnalysis | undefined;
    if (templateContent) {
      const filePath = entity.templateUrl
        ? resolveTemplatePath(absoluteComponentPath, entity.templateUrl, baseDir)
        : absoluteComponentPath;

      templateAnalysis = analyzeTemplate(templateContent, filePath);
    }

    return {
      templateLocation,
      templateAnalysis,
    };
  }

  /**
   * Check if template has specific component selector
   */
  usesComponent(analysis: TemplateAnalysis, selector: string): boolean {
    return analysis.usedComponents.includes(selector);
  }

  /**
   * Check if template uses specific directive
   */
  usesDirective(analysis: TemplateAnalysis, directive: string): boolean {
    return analysis.usedDirectives.includes(directive);
  }

  /**
   * Check if template uses specific pipe
   */
  usesPipe(analysis: TemplateAnalysis, pipe: string): boolean {
    return analysis.usedPipes.includes(pipe);
  }
}
