#!/usr/bin/env node

/**
 * Generate all output formats for Angular Material Components
 */

import { NgParser } from './dist/src/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const projectPath = '/home/antoine/dev/components/src/material';
const outputDir = '/home/antoine/dev/components';

console.log('🚀 Parsing Angular Material project...');
console.log(`   Path: ${projectPath}`);
console.log(`   Output: ${outputDir}\n`);

const parser = new NgParser({ rootDir: projectPath });
const result = await parser.parse();

console.log(`✓ Parsed ${result.metadata.totalEntities} entities\n`);

// 1. Generate all detail levels
console.log('📝 Generating Markdown outputs...\n');

const levels = ['overview', 'features', 'detailed', 'complete'];
for (const level of levels) {
  const output = result.toMarkdown(level);
  const filename = `ng-parser-output.${level}.md`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, output);

  const sizeKB = (output.length / 1024).toFixed(1);
  const estimatedTokens = Math.round(output.length * 0.25);

  console.log(`  ✓ ${filename}`);
  console.log(`    Size: ${sizeKB} KB`);
  console.log(`    Tokens: ~${estimatedTokens.toLocaleString()}`);
  console.log();
}

// 2. Generate JSON outputs
console.log('📊 Generating JSON outputs...\n');

// Full JSON
const fullJson = result.toJSON();
const fullJsonPath = join(outputDir, 'ng-parser-output.full.json');
writeFileSync(fullJsonPath, JSON.stringify(fullJson, null, 2));
console.log(`  ✓ ng-parser-output.full.json`);
console.log(`    Size: ${(JSON.stringify(fullJson).length / 1024).toFixed(1)} KB\n`);

// Simple JSON
const simpleJson = result.toSimpleJSON();
const simpleJsonPath = join(outputDir, 'ng-parser-output.simple.json');
writeFileSync(simpleJsonPath, JSON.stringify(simpleJson, null, 2));
console.log(`  ✓ ng-parser-output.simple.json`);
console.log(`    Size: ${(JSON.stringify(simpleJson).length / 1024).toFixed(1)} KB\n`);

// GraphRAG JSON
const graphRag = result.toGraphRAG();
const graphRagPath = join(outputDir, 'ng-parser-output.graphrag.json');
writeFileSync(graphRagPath, JSON.stringify(graphRag, null, 2));
console.log(`  ✓ ng-parser-output.graphrag.json`);
console.log(`    Size: ${(JSON.stringify(graphRag).length / 1024).toFixed(1)} KB\n`);

// 3. Generate HTML
console.log('🌐 Generating HTML output...\n');

const html = result.toHTML();
const htmlPath = join(outputDir, 'ng-parser-output.html');
writeFileSync(htmlPath, html);
console.log(`  ✓ ng-parser-output.html`);
console.log(`    Size: ${(html.length / 1024).toFixed(1)} KB\n`);

// 4. Generate semantic chunks
console.log('📦 Generating semantic chunks...\n');

const chunksDir = join(outputDir, 'ng-parser-chunks');
mkdirSync(chunksDir, { recursive: true });

const { chunks, manifest } = await result.toMarkdownChunked('detailed');

console.log(`  ✓ Created ${chunks.length} chunks\n`);

// Save manifest
const manifestPath = join(chunksDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`  📋 manifest.json`);
console.log(`     Total entities: ${manifest.totalEntities}`);
console.log(`     Total chunks: ${manifest.totalChunks}\n`);

// Save each chunk
chunks.forEach((chunk, index) => {
  const filename = `${chunk.metadata.chunkId}.md`;
  const filepath = join(chunksDir, filename);

  writeFileSync(filepath, chunk.content);

  const sizeKB = (chunk.content.length / 1024).toFixed(1);

  console.log(`  ✓ ${filename}`);
  console.log(`     Feature: ${chunk.metadata.feature}`);
  console.log(`     Entities: ${chunk.metadata.entities.length}`);
  console.log(`     Size: ${sizeKB} KB (~${chunk.metadata.tokenCount.toLocaleString()} tokens)`);
  if (chunk.metadata.relatedChunks.length > 0) {
    console.log(`     Related: ${chunk.metadata.relatedChunks.join(', ')}`);
  }
  console.log();
});

// 5. Generate summary
console.log('📊 Summary\n');

const totalSize =
  levels.reduce((sum, level) => {
    const output = result.toMarkdown(level);
    return sum + output.length;
  }, 0) +
  JSON.stringify(fullJson).length +
  JSON.stringify(simpleJson).length +
  JSON.stringify(graphRag).length +
  html.length +
  chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);

console.log(`  Total files generated: ${4 + 3 + 1 + chunks.length + 1}`);
console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log();
console.log('✨ Done! Check the following directories:');
console.log(`   - ${outputDir}/ng-parser-output.*.md`);
console.log(`   - ${outputDir}/ng-parser-output.*.json`);
console.log(`   - ${outputDir}/ng-parser-output.html`);
console.log(`   - ${chunksDir}/`);
