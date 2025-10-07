#!/usr/bin/env node

/**
 * Test script for semantic chunking
 */

import { NgParser } from './dist/src/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const projectPath = '/home/antoine/dev/components/src/material';

console.log('Parsing Angular Material project...');
console.log('This may take a few minutes...\n');

const parser = new NgParser({ rootDir: projectPath });
const result = await parser.parse();

console.log(`✓ Parsed ${result.metadata.totalEntities} entities\n`);

// Test chunking
console.log('Creating semantic chunks...\n');

const { chunks, manifest } = await result.toMarkdownChunked('detailed');

console.log(`✓ Created ${chunks.length} chunks\n`);

// Write manifest
const manifestPath = join('/home/antoine/dev/components', 'ng-parser-chunks-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${manifestPath}`);

// Write each chunk
chunks.forEach((chunk, index) => {
  const filename = `ng-parser-chunk-${chunk.metadata.chunkId}.md`;
  const filepath = join('/home/antoine/dev/components', filename);

  writeFileSync(filepath, chunk.content);

  const sizeKB = (chunk.content.length / 1024).toFixed(1);
  console.log(`  Chunk ${index + 1}/${chunks.length}: ${filename}`);
  console.log(`    Feature: ${chunk.metadata.feature}`);
  console.log(`    Entities: ${chunk.metadata.entities.length}`);
  console.log(`    Size: ${sizeKB} KB (~${chunk.metadata.tokenCount.toLocaleString()} tokens)`);
  if (chunk.metadata.relatedChunks.length > 0) {
    console.log(`    Related: ${chunk.metadata.relatedChunks.join(', ')}`);
  }
  console.log();
});

console.log('Done! Check /home/antoine/dev/components/ for chunks.');
