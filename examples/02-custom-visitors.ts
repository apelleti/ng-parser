#!/usr/bin/env node
/**
 * Demo: Creating a Custom Visitor
 *
 * This example shows how to create your own custom visitor
 * to extend ng-parser with custom analysis logic.
 */

import * as ts from 'typescript';
import { NgParser, BaseVisitor, type VisitorContext, type Entity } from '../src';

/**
 * Custom visitor that extracts deprecated Angular feature patterns
 * (Extraction only - no evaluation or recommendations)
 */
class DeprecatedFeaturesVisitor extends BaseVisitor<DeprecatedFeaturesResult> {
  readonly name = 'DeprecatedFeaturesVisitor';
  readonly description = 'Extracts patterns of deprecated Angular features';
  readonly priority = 60;
  readonly version = '1.0.0';

  private patterns: DeprecatedFeature[] = [];

  onBeforeParse(context: VisitorContext): void {
    super.onBeforeParse(context);
    // Silent - logs only at the end
  }

  async visitNode(node: ts.Node, context: VisitorContext): Promise<void> {
    // Extract deprecated decorator patterns
    if (ts.isDecorator(node)) {
      const decoratorName = node.expression.getText(context.sourceFile);

      // Extract @ViewChild without static flag pattern
      if (decoratorName.includes('ViewChild') && !decoratorName.includes('static')) {
        this.patterns.push({
          feature: 'ViewChild without static flag',
          location: context.sourceFile.fileName,
          line: context.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          version: 'Angular 8+',
        });
      }
    }

    // Extract deprecated import patterns
    if (ts.isImportDeclaration(node)) {
      const importText = node.getText(context.sourceFile);

      // Extract @angular/http usage pattern
      if (importText.includes('@angular/http')) {
        this.patterns.push({
          feature: '@angular/http package',
          location: context.sourceFile.fileName,
          line: context.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          version: 'Removed in Angular 12',
        });
      }

      // Extract DOCUMENT import from wrong package pattern
      if (importText.includes('DOCUMENT') && importText.includes('@angular/platform-browser')) {
        this.patterns.push({
          feature: 'DOCUMENT from @angular/platform-browser',
          location: context.sourceFile.fileName,
          line: context.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          version: 'Angular 4+',
        });
      }
    }

    // Extract ReflectiveInjector usage pattern
    if (ts.isIdentifier(node) && node.text === 'ReflectiveInjector') {
      this.patterns.push({
        feature: 'ReflectiveInjector',
        location: context.sourceFile.fileName,
        line: context.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        version: 'Deprecated in Angular 5',
      });
    }
  }

  onAfterParse(context: VisitorContext): void {
    // No console logs - only metrics
    this.addMetric(context, 'deprecated_feature_patterns', this.patterns.length);
  }

  getResults(): DeprecatedFeaturesResult {
    return {
      patterns: this.patterns,
      totalPatterns: this.patterns.length,
    };
  }

  reset(): void {
    super.reset();
    this.patterns = [];
  }
}

interface DeprecatedFeature {
  feature: string;
  location: string;
  line: number;
  version: string;
}

interface DeprecatedFeaturesResult {
  patterns: DeprecatedFeature[];
  totalPatterns: number;
}

/**
 * Custom visitor that extracts component complexity metrics
 * (Extraction only - no evaluation of what's good/bad)
 */
class ComponentComplexityVisitor extends BaseVisitor<ComplexityResult> {
  readonly name = 'ComponentComplexityVisitor';
  readonly description = 'Extracts component complexity metrics';
  readonly priority = 50;
  readonly version = '1.0.0';

  private componentMetrics: ComponentComplexity[] = [];

  async visitEntity(entity: Entity, context: VisitorContext): Promise<void> {
    if (entity.type !== 'component') return;

    // Extract component metrics (facts only, no judgment)
    const inputCount = (entity as any).inputs?.length || 0;
    const outputCount = (entity as any).outputs?.length || 0;
    const lifecycleHooks = (entity as any).lifecycle?.length || 0;

    this.componentMetrics.push({
      componentName: entity.name,
      inputs: inputCount,
      outputs: outputCount,
      lifecycleHooks,
    });
  }

  onAfterParse(context: VisitorContext): void {
    // No console logs - only metrics
    this.addMetric(context, 'total_components_analyzed', this.componentMetrics.length);
  }

  getResults(): ComplexityResult {
    return {
      metrics: this.componentMetrics,
      totalComponents: this.componentMetrics.length,
    };
  }

  reset(): void {
    super.reset();
    this.componentMetrics = [];
  }
}

interface ComponentComplexity {
  componentName: string;
  inputs: number;
  outputs: number;
  lifecycleHooks: number;
}

interface ComplexityResult {
  metrics: ComponentComplexity[];
  totalComponents: number;
}

// === Main Demo ===

async function main() {
  console.log('🎨 Custom Visitor Demo\n');

  const parser = new NgParser({
    rootDir: './sample-angular-app/src',
  });

  // Register our custom visitors
  parser.registerVisitor(new DeprecatedFeaturesVisitor());
  parser.registerVisitor(new ComponentComplexityVisitor());

  console.log('📦 Registered custom visitors:');
  for (const visitor of parser.getVisitors()) {
    console.log(`  - ${visitor.name}: ${visitor.description}`);
  }
  console.log('');

  // Parse the project
  const result = await parser.parse();

  // Display results summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Custom Visitor Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Deprecated feature patterns
  const deprecatedResults = result.customAnalysis.get('DeprecatedFeaturesVisitor') as any;
  if (deprecatedResults && deprecatedResults.totalPatterns > 0) {
    console.log(`📋 Deprecated Features: ${deprecatedResults.totalPatterns} patterns`);
    const topPatterns = deprecatedResults.patterns.slice(0, 3).map((p: any) => p.feature).join(', ');
    console.log(`   Top: ${topPatterns}\n`);
  }

  // Component metrics
  const metricsResults = result.customAnalysis.get('ComponentComplexityVisitor') as any;
  if (metricsResults && metricsResults.totalComponents > 0) {
    console.log(`📊 Component Metrics: ${metricsResults.totalComponents} components analyzed`);
    if (metricsResults.metrics?.length > 0) {
      const avgInputs = (metricsResults.metrics.reduce((sum: number, m: any) => sum + m.inputs, 0) / metricsResults.metrics.length).toFixed(1);
      const avgOutputs = (metricsResults.metrics.reduce((sum: number, m: any) => sum + m.outputs, 0) / metricsResults.metrics.length).toFixed(1);
      console.log(`   Avg inputs: ${avgInputs}, Avg outputs: ${avgOutputs}\n`);
    }
  }

  console.log('✨ Parsing complete!\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
