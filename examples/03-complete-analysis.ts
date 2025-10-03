#!/usr/bin/env node
/**
 * Complete Analysis Example
 *
 * This example demonstrates ALL features of ng-parser:
 * - Core Angular parsing (Components, Services, Modules, Directives, Pipes)
 * - All built-in visitors (RxJS, Security, Performance)
 * - All export formats (JSON, Markdown, GraphRAG, SimpleJSON)
 * - Advanced analysis and reporting
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  NgParser,
  RxJSPatternVisitor,
  SecurityVisitor,
  PerformanceVisitor,
} from '../src';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     NgParser - Complete Analysis Example                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ========================================
  // 1. INITIALIZE PARSER
  // ========================================
  console.log('📦 Step 1: Initialize Parser\n');

  const parser = new NgParser({
    rootDir: './sample-angular-app/src',
  });

  console.log('   ✓ Parser created');
  console.log('   ✓ Root directory: ./sample-angular-app/src\n');

  // ========================================
  // 2. REGISTER VISITORS
  // ========================================
  console.log('🔌 Step 2: Register Custom Visitors\n');

  const visitors = [
    new RxJSPatternVisitor(),
    new SecurityVisitor(),
    new PerformanceVisitor(),
  ];

  visitors.forEach(visitor => {
    parser.registerVisitor(visitor);
    console.log(`   ✓ ${visitor.name} (priority: ${visitor.priority})`);
  });

  console.log('');

  // ========================================
  // 3. PARSE PROJECT
  // ========================================
  console.log('🚀 Step 3: Parse Angular Project\n');
  console.log('   Analyzing TypeScript files...');

  const startTime = Date.now();
  const result = await parser.parse();
  const duration = Date.now() - startTime;

  console.log(`   ✓ Parsing completed in ${duration}ms\n`);

  // ========================================
  // 4. CORE ANGULAR ANALYSIS
  // ========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CORE ANGULAR ENTITIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total Entities: ${result.metadata.totalEntities}`);
  console.log(`Total Relationships: ${result.metadata.totalRelationships}\n`);

  // Count by type
  const entityCounts = new Map<string, number>();
  for (const entity of result.entities.values()) {
    entityCounts.set(entity.type, (entityCounts.get(entity.type) || 0) + 1);
  }

  console.log('Entities by Type:');
  for (const [type, count] of Array.from(entityCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type.padEnd(15)} ${count}`);
  }

  console.log('');

  // ========================================
  // 5. VISITOR RESULTS SUMMARY
  // ========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔌 VISITOR RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor') as any;
  if (rxjsResults && rxjsResults.totalObservables > 0) {
    console.log(`📡 RxJS: ${rxjsResults.totalObservables} observables (${rxjsResults.observablesInComponents} in components)`);
    console.log(`   Components with ngOnDestroy: ${rxjsResults.componentsWithNgOnDestroy.length}`);
    console.log(`   Components without ngOnDestroy: ${rxjsResults.componentsWithoutNgOnDestroy.length}\n`);
  }

  const securityResults = result.customAnalysis.get('SecurityVisitor') as any;
  if (securityResults && securityResults.totalPatterns > 0) {
    const topPatterns = Object.entries(securityResults.byPattern)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([p, c]) => `${p}(${c})`)
      .join(', ');
    console.log(`🔒 Security: ${securityResults.totalPatterns} patterns - ${topPatterns}\n`);
  }

  const perfResults = result.customAnalysis.get('PerformanceVisitor') as any;
  if (perfResults && perfResults.totalPatterns > 0) {
    const topPatterns = Object.entries(perfResults.byPattern)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([p, c]) => `${p}(${c})`)
      .join(', ');
    console.log(`⚡ Performance: ${perfResults.totalPatterns} patterns - ${topPatterns}\n`);
  }

  // ========================================
  // 6. METRICS
  // ========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 METRICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Display only key metrics
  const keyMetrics = [
    'total_observables',
    'total_security_patterns',
    'total_performance_patterns'
  ];

  for (const key of keyMetrics) {
    const value = result.metrics.get(key);
    if (value !== undefined) {
      console.log(`   ${key}: ${value}`);
    }
  }

  // ========================================
  // 7. EXPORT FORMATS
  // ========================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💾 EXPORT FORMATS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const outputDir = './examples/output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Export JSON (complete data with all details)
  const jsonResult = result.toJSON();
  fs.writeFileSync(`${outputDir}/ng-parser.full.json`, JSON.stringify(jsonResult, null, 2));
  console.log(`   ✓ JSON (full) exported (${JSON.stringify(jsonResult).length} bytes)`);
  console.log(`     → ${outputDir}/ng-parser.full.json`);

  // Export Markdown (RAG-optimized for LLMs)
  try {
    const markdown = result.toMarkdown();
    fs.writeFileSync(`${outputDir}/ng-parser.rag.md`, markdown);
    console.log(`   ✓ Markdown (RAG) exported (${markdown.length} bytes)`);
    console.log(`     → ${outputDir}/ng-parser.rag.md`);
  } catch (e: any) {
    console.log(`   ⚠️  Markdown export: ${e.message}`);
  }

  // Export GraphRAG (knowledge graph for graph databases)
  try {
    const graphRAG = result.toGraphRAG();
    fs.writeFileSync(`${outputDir}/ng-parser.graph.json`, JSON.stringify(graphRAG, null, 2));
    console.log(`   ✓ GraphRAG (knowledge graph) exported (${JSON.stringify(graphRAG).length} bytes)`);
    console.log(`     → ${outputDir}/ng-parser.graph.json`);
  } catch (e: any) {
    console.log(`   ⚠️  GraphRAG export: ${e.message}`);
  }

  // Export SimpleJSON (ng-analyzer compatible, entities only)
  try {
    const simpleJSON = result.toSimpleJSON();
    fs.writeFileSync(`${outputDir}/ng-parser.simple.json`, JSON.stringify(simpleJSON, null, 2));
    console.log(`   ✓ SimpleJSON (entities only) exported (${JSON.stringify(simpleJSON).length} bytes)`);
    console.log(`     → ${outputDir}/ng-parser.simple.json`);
  } catch (e: any) {
    console.log(`   ⚠️  SimpleJSON export: ${e.message}`);
  }

  // ========================================
  // 8. SUMMARY
  // ========================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Entities:        ${result.metadata.totalEntities}`);
  console.log(`Relationships:   ${result.metadata.totalRelationships}`);
  console.log(`RxJS Patterns:   ${rxjsResults?.totalObservables || 0}`);
  console.log(`Security:        ${securityResults?.totalPatterns || 0} patterns`);
  console.log(`Performance:     ${perfResults?.totalPatterns || 0} patterns`);
  console.log(`Duration:        ${duration}ms`);

  console.log('\n✨ Parsing complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
