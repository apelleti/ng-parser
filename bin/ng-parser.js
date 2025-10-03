#!/usr/bin/env node
"use strict";
/**
 * ng-parser CLI
 * Simple command-line interface for parsing Angular projects
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const src_1 = require("../src");
const program = new commander_1.Command();
// Package info
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
program
    .name('ng-parser')
    .description('Advanced Angular parser with RAG/GraphRAG optimized output')
    .version(packageJson.version);
// Parse command
program
    .command('parse <directory>')
    .description('Parse an Angular project')
    .option('-o, --output <file>', 'Output file path')
    .option('-f, --format <format>', 'Output format: full|simple|markdown|graph|all', 'full')
    .option('--visitors <visitors>', 'Enable visitors (comma-separated: rxjs,security,performance)')
    .option('--all-visitors', 'Enable all built-in visitors')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (directory, options) => {
    try {
        console.log(`🚀 ng-parser v${packageJson.version}\n`);
        // Validate directory
        if (!fs.existsSync(directory)) {
            console.error(`❌ Error: Directory not found: ${directory}`);
            process.exit(1);
        }
        console.log(`📦 Parsing: ${directory}\n`);
        // Create parser
        const parser = new src_1.NgParser({ rootDir: directory });
        // Register visitors if requested
        const visitorsEnabled = [];
        if (options.allVisitors) {
            parser.registerVisitor(new src_1.RxJSPatternVisitor());
            parser.registerVisitor(new src_1.SecurityVisitor());
            parser.registerVisitor(new src_1.PerformanceVisitor());
            visitorsEnabled.push('RxJS', 'Security', 'Performance');
        }
        else if (options.visitors) {
            const visitorList = options.visitors.split(',').map((v) => v.trim().toLowerCase());
            if (visitorList.includes('rxjs')) {
                parser.registerVisitor(new src_1.RxJSPatternVisitor());
                visitorsEnabled.push('RxJS');
            }
            if (visitorList.includes('security') || visitorList.includes('sec')) {
                parser.registerVisitor(new src_1.SecurityVisitor());
                visitorsEnabled.push('Security');
            }
            if (visitorList.includes('performance') || visitorList.includes('perf')) {
                parser.registerVisitor(new src_1.PerformanceVisitor());
                visitorsEnabled.push('Performance');
            }
        }
        if (options.verbose && visitorsEnabled.length > 0) {
            console.log(`🔌 Visitors enabled: ${visitorsEnabled.join(', ')}\n`);
        }
        // Parse
        const startTime = Date.now();
        const result = await parser.parse();
        const duration = Date.now() - startTime;
        console.log(`✅ Parsed in ${duration}ms\n`);
        // Display summary
        console.log('📊 Results:');
        // Count entities by type
        const entityCounts = new Map();
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
            const rxjsResults = result.customAnalysis.get('RxJSPatternVisitor');
            if (rxjsResults) {
                const withoutDestroy = rxjsResults.componentsWithoutNgOnDestroy?.length || 0;
                console.log(`   RxJS:         ${rxjsResults.totalObservables} observables (${withoutDestroy} without ngOnDestroy)`);
            }
            const securityResults = result.customAnalysis.get('SecurityVisitor');
            if (securityResults && securityResults.totalPatterns > 0) {
                const topPatterns = Object.entries(securityResults.byPattern || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([p]) => p)
                    .join(', ');
                console.log(`   Security:     ${securityResults.totalPatterns} patterns (${topPatterns})`);
            }
            const perfResults = result.customAnalysis.get('PerformanceVisitor');
            if (perfResults && perfResults.totalPatterns > 0) {
                const topPatterns = Object.entries(perfResults.byPattern || {})
                    .sort((a, b) => b[1] - a[1])
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
                fs.writeFileSync(path.join(outputDir, `${outputBase}.full.json`), JSON.stringify(fullJson, null, 2));
                console.log(`   ✓ ${outputBase}.full.json`);
                const simpleJson = result.toSimpleJSON();
                fs.writeFileSync(path.join(outputDir, `${outputBase}.simple.json`), JSON.stringify(simpleJson, null, 2));
                console.log(`   ✓ ${outputBase}.simple.json`);
                const markdown = result.toMarkdown();
                fs.writeFileSync(path.join(outputDir, `${outputBase}.rag.md`), markdown);
                console.log(`   ✓ ${outputBase}.rag.md`);
                const graph = result.toGraphRAG();
                fs.writeFileSync(path.join(outputDir, `${outputBase}.graph.json`), JSON.stringify(graph, null, 2));
                console.log(`   ✓ ${outputBase}.graph.json`);
            }
            else {
                // Export single format
                let content;
                let extension;
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
        }
        else {
            // Suggest export command
            console.log('\n💡 Export results:');
            console.log(`   ng-parser parse ${directory} -o output.json`);
            console.log(`   ng-parser parse ${directory} -f all -o ./output/project`);
        }
        console.log('');
    }
    catch (error) {
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
//# sourceMappingURL=ng-parser.js.map