#!/usr/bin/env node
/**
 * Demo: New NgParser API with Custom Visitors
 *
 * This example demonstrates the new two-layer architecture:
 * 1. Core Angular parsing (built-in)
 * 2. Custom visitors (extensible)
 */

import {
  NgParser,
  RxJSPatternVisitor,
  SecurityVisitor,
  PerformanceVisitor,
} from '../src';

async function main() {
  console.log('🚀 NgParser v2 - New Architecture Demo\n');

  // 1. Create parser instance
  const parser = new NgParser({
    rootDir: './sample-angular-app/src',
  });

  // 2. Register custom visitors
  console.log('📦 Registering custom visitors...');
  parser.registerVisitor(new RxJSPatternVisitor());
  parser.registerVisitor(new SecurityVisitor());
  parser.registerVisitor(new PerformanceVisitor());

  console.log(`✅ Registered ${parser.getVisitors().length} visitors\n`);

  // 3. Parse the project
  const result = await parser.parse();

  // 4. Display core Angular parsing results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Core Angular Entities');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total entities: ${result.metadata.totalEntities}`);
  console.log(`Total relationships: ${result.metadata.totalRelationships}`);

  // Count entities by type
  const entityTypes = new Map<string, number>();
  for (const entity of result.entities.values()) {
    const count = entityTypes.get(entity.type) || 0;
    entityTypes.set(entity.type, count + 1);
  }

  console.log('\nEntities by type:');
  for (const [type, count] of entityTypes) {
    console.log(`  - ${type}: ${count}`);
  }

  // 5. Display custom visitor results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔌 Custom Visitor Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // RxJS Pattern Extraction
  const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor') as any;
  if (rxjsResults) {
    console.log('📡 RxJS Pattern Extraction:');
    console.log(`  - Total observables: ${rxjsResults.totalObservables} (${rxjsResults.observablesInComponents} in components)`);
    console.log(`  - Components with ngOnDestroy: ${rxjsResults.componentsWithNgOnDestroy?.length || 0}`);
    console.log(`  - Components without ngOnDestroy: ${rxjsResults.componentsWithoutNgOnDestroy?.length || 0}`);
    console.log('');
  }

  // Security Pattern Extraction
  const securityResults = result.customAnalysis.get('SecurityVisitor') as any;
  if (securityResults) {
    console.log('🔒 Security Pattern Extraction:');
    console.log(`  - Total patterns: ${securityResults.totalPatterns}`);

    if (securityResults.totalPatterns > 0) {
      const topPatterns = Object.entries(securityResults.byPattern || {})
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      console.log(`  - Top patterns: ${topPatterns.map(([p, c]) => `${p}(${c})`).join(', ')}`);
    }
    console.log('');
  }

  // Performance Pattern Extraction
  const perfResults = result.customAnalysis.get('PerformanceVisitor') as any;
  if (perfResults) {
    console.log('⚡ Performance Pattern Extraction:');
    console.log(`  - Total patterns: ${perfResults.totalPatterns}`);

    if (perfResults.totalPatterns > 0) {
      const topPatterns = Object.entries(perfResults.byPattern || {})
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      console.log(`  - Top patterns: ${topPatterns.map(([p, c]) => `${p}(${c})`).join(', ')}`);
    }
    console.log('');
  }

  // 6. Display metrics
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const [key, value] of result.metrics) {
    console.log(`  ${key}: ${value}`);
  }

  // 7. Display warnings and errors
  if (result.warnings.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⚠️  Warnings (${result.warnings.length})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const warning of result.warnings.slice(0, 10)) {
      console.log(`  ${warning.code}: ${warning.message}`);
      console.log(`    at ${warning.location.filePath}:${warning.location.line}`);
    }

    if (result.warnings.length > 10) {
      console.log(`\n  ... and ${result.warnings.length - 10} more warnings`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ Errors (${result.errors.length})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const error of result.errors) {
      console.log(`  ${error.code}: ${error.message}`);
      console.log(`    at ${error.location.filePath}:${error.location.line}`);
    }
  }

  // 8. Export results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💾 Export Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Export to JSON
  const jsonResult = result.toJSON();
  console.log('✅ JSON export available (result.toJSON())');
  console.log(`   Size: ${JSON.stringify(jsonResult).length} bytes`);

  console.log('\n✨ Parsing complete!\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
