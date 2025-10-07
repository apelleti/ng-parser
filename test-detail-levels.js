#!/usr/bin/env node

/**
 * Test script to demonstrate the new detail levels
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

// Generate all detail levels
const levels = ['overview', 'features', 'detailed', 'complete'];

for (const level of levels) {
  console.log(`Generating ${level} level...`);
  const output = result.toMarkdown(level);
  const filename = `ng-parser-output.${level}.md`;
  const filepath = join('/home/antoine/dev/components', filename);

  writeFileSync(filepath, output);

  // Calculate size
  const sizeKB = (output.length / 1024).toFixed(1);
  const estimatedTokens = Math.round(output.length * 0.25); // rough estimate

  console.log(`  → ${filename}`);
  console.log(`  → Size: ${sizeKB} KB (~${estimatedTokens.toLocaleString()} tokens)\n`);
}

console.log('Done! Check /home/antoine/dev/components/ for output files.');
