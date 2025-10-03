#!/usr/bin/env node
/**
 * ng-parser CLI
 * Simple command-line interface for parsing Angular projects
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  NgParser,
  RxJSPatternVisitor,
  SecurityVisitor,
  PerformanceVisitor,
} from '../src';

const program = new Command();

// Package info
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

program
  .name('ng-parser')
  .description('Advanced Angular parser with RAG/GraphRAG optimized output')
  .version(packageJson.version);

// Parse command
program
  .command('parse <directory>')
  .description('Parse an Angular project')
  .option('-o, --output <file>', 'Output file path')
  .option(
    '-f, --format <format>',
    'Output format: full|simple|markdown|graph|all',
    'full'
  )
  .option('--visitors <visitors>', 'Enable visitors (comma-separated: rxjs,security,performance)')
  .option('--all-visitors', 'Enable all built-in visitors')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (directory: string, options: any) => {
    try {
      console.log(`🚀 ng-parser v${packageJson.version}\n`);

      // Validate directory
      if (!fs.existsSync(directory)) {
        console.error(`❌ Error: Directory not found: ${directory}`);
        process.exit(1);
      }

      console.log(`📦 Parsing: ${directory}\n`);

      // Create parser
      const parser = new NgParser({ rootDir: directory });

      // Register visitors if requested
      const visitorsEnabled: string[] = [];

      if (options.allVisitors) {
        parser.registerVisitor(new RxJSPatternVisitor());
        parser.registerVisitor(new SecurityVisitor());
        parser.registerVisitor(new PerformanceVisitor());
        visitorsEnabled.push('RxJS', 'Security', 'Performance');
      } else if (options.visitors) {
        const visitorList = options.visitors.split(',').map((v: string) => v.trim().toLowerCase());

        if (visitorList.includes('rxjs')) {
          parser.registerVisitor(new RxJSPatternVisitor());
          visitorsEnabled.push('RxJS');
        }
        if (visitorList.includes('security') || visitorList.includes('sec')) {
          parser.registerVisitor(new SecurityVisitor());
          visitorsEnabled.push('Security');
        }
        if (visitorList.includes('performance') || visitorList.includes('perf')) {
          parser.registerVisitor(new PerformanceVisitor());
          visitorsEnabled.push('Performance');
        }
      }

      if (options.verbose && visitorsEnabled.length > 0) {
        console.log(`🔌 Visitors enabled: ${visitorsEnabled.join(', ')}\n`);
      }

      // Parse
      const startTime = Date.now();
      const result = await parser.parse(directory);
      const duration = Date.now() - startTime;

      console.log(`✅ Parsed in ${duration}ms\n`);

      // Display summary
      console.log('📊 Results:');

      // Count entities by type
      const entityCounts = new Map<string, number>();
      for (const entity of result.entities.values()) {
        entityCounts.set(entity.type, (entityCounts.get(entity.type) || 0) + 1);
      }

      const sortedTypes = Array.from(entityCounts.entries()).sort((a, b) => b[1] - a[1]);
      for (const [type, count] of sortedTypes) {
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1) + 's';
        console.log(`   ${capitalizedType.padEnd(15)} ${count}`);
      }

      console.log(`\n   Total entities:       ${result.metadata.totalEntities}`);
      console.log(`   Total relationships:  ${result.metadata.totalRelationships}`);

      // Display visitor results
      if (visitorsEnabled.length > 0) {
        console.log('\n🔌 Visitor Results:');

        const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor') as any;
        if (rxjsResults) {
          const withoutDestroy = rxjsResults.componentsWithoutNgOnDestroy?.length || 0;
          console.log(`   RxJS:         ${rxjsResults.totalObservables} observables (${withoutDestroy} without ngOnDestroy)`);
        }

        const securityResults = result.customAnalysis.get('SecurityVisitor') as any;
        if (securityResults && securityResults.totalPatterns > 0) {
          const topPatterns = Object.entries(securityResults.byPattern || {})
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 3)
            .map(([p]) => p)
            .join(', ');
          console.log(`   Security:     ${securityResults.totalPatterns} patterns (${topPatterns})`);
        }

        const perfResults = result.customAnalysis.get('PerformanceVisitor') as any;
        if (perfResults && perfResults.totalPatterns > 0) {
          const topPatterns = Object.entries(perfResults.byPattern || {})
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 3)
            .map(([p]) => p)
            .join(', ');
          console.log(`   Performance:  ${perfResults.totalPatterns} patterns (${topPatterns})`);
        }
      }

      // Export if output file specified
      if (options.output) {
        console.log('\n💾 Exporting...');

        const outputPath = path.resolve(options.output);
        const outputDir = path.dirname(outputPath);
        const outputBase = path.basename(outputPath, path.extname(outputPath));

        // Create output directory if needed
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const format = options.format.toLowerCase();

        if (format === 'all') {
          // Export all formats
          const fullJson = result.toJSON();
          fs.writeFileSync(
            path.join(outputDir, `${outputBase}.full.json`),
            JSON.stringify(fullJson, null, 2)
          );
          console.log(`   ✓ ${outputBase}.full.json`);

          const simpleJson = result.toSimpleJSON();
          fs.writeFileSync(
            path.join(outputDir, `${outputBase}.simple.json`),
            JSON.stringify(simpleJson, null, 2)
          );
          console.log(`   ✓ ${outputBase}.simple.json`);

          const markdown = result.toMarkdown();
          fs.writeFileSync(path.join(outputDir, `${outputBase}.rag.md`), markdown);
          console.log(`   ✓ ${outputBase}.rag.md`);

          const graph = result.toGraphRAG();
          fs.writeFileSync(
            path.join(outputDir, `${outputBase}.graph.json`),
            JSON.stringify(graph, null, 2)
          );
          console.log(`   ✓ ${outputBase}.graph.json`);
        } else {
          // Export single format
          let content: string;
          let extension: string;

          switch (format) {
            case 'simple':
              content = JSON.stringify(result.toSimpleJSON(), null, 2);
              extension = '.json';
              break;
            case 'markdown':
            case 'rag':
              content = result.toMarkdown();
              extension = '.md';
              break;
            case 'graph':
              content = JSON.stringify(result.toGraphRAG(), null, 2);
              extension = '.json';
              break;
            case 'full':
            default:
              content = JSON.stringify(result.toJSON(), null, 2);
              extension = '.json';
              break;
          }

          const finalPath = outputPath.endsWith(extension) ? outputPath : outputPath + extension;
          fs.writeFileSync(finalPath, content);
          console.log(`   ✓ ${path.basename(finalPath)}`);
        }
      } else {
        // Suggest export command
        console.log('\n💡 Export results:');
        console.log(`   ng-parser parse ${directory} -o output.json`);
        console.log(`   ng-parser parse ${directory} -f all -o ./output/project`);
      }

      console.log('');
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
