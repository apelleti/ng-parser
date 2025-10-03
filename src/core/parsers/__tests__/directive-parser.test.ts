/**
 * Unit tests for DirectiveParser
 */

import * as ts from 'typescript';
import { DirectiveParser } from '../directive-parser.js';
import { EntityType, RelationType } from '../../../types/index.js';
import {
  createProgram,
  findClass,
  createMockContext,
} from '../../../__tests__/helpers/test-utils.js';
import {
  SIMPLE_DIRECTIVE,
  STANDALONE_DIRECTIVE,
  DIRECTIVE_WITH_INPUTS_OUTPUTS,
  STRUCTURAL_DIRECTIVE,
} from '../../../__tests__/helpers/fixtures.js';

describe('DirectiveParser', () => {
  let parser: DirectiveParser;

  beforeEach(() => {
    parser = new DirectiveParser();
  });

  describe('Basic Directive Parsing', () => {
    it('should parse a simple directive', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      expect(classNode).toBeDefined();

      parser.parse(classNode!, context);

      const results = parser.getResults();
      expect(results).toHaveLength(1);

      const directive = results[0];
      expect(directive.type).toBe(EntityType.Directive);
      expect(directive.name).toBe('HighlightDirective');
      expect(directive.selector).toBe('[appHighlight]');
      expect(directive.standalone).toBe(false);
    });

    it('should generate correct entity ID', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.id).toContain('HighlightDirective');
      expect(directive.id).toContain('directive');
    });

    it('should extract location information', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.location).toBeDefined();
      expect(directive.location.filePath).toBe('test.ts');
      expect(directive.location.line).toBeGreaterThan(0);
    });

    it('should not parse non-directive classes', () => {
      const code = `
        export class NotADirective {
          // Just a regular class
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NotADirective');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(0);
    });
  });

  describe('Standalone Directives', () => {
    it('should parse standalone directive', () => {
      const { program, sourceFile, typeChecker } = createProgram(STANDALONE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'StandaloneDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.standalone).toBe(true);
      expect(directive.selector).toBe('[appStandalone]');
    });
  });

  describe('Inputs and Outputs', () => {
    it('should extract @Input properties', () => {
      const { program, sourceFile, typeChecker } = createProgram(DIRECTIVE_WITH_INPUTS_OUTPUTS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ToggleDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.inputs).toBeDefined();
      expect(directive.inputs!.length).toBeGreaterThan(0);

      const enabledInput = directive.inputs!.find((i) => i.name === 'enabled');
      expect(enabledInput).toBeDefined();
      expect(enabledInput!.type).toBe('boolean');
    });

    it('should extract @Output properties', () => {
      const { program, sourceFile, typeChecker } = createProgram(DIRECTIVE_WITH_INPUTS_OUTPUTS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ToggleDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.outputs).toBeDefined();
      expect(directive.outputs!.length).toBeGreaterThan(0);

      const toggledOutput = directive.outputs!.find((o) => o.name === 'toggled');
      expect(toggledOutput).toBeDefined();
    });

    it('should handle input aliases', () => {
      const { program, sourceFile, typeChecker } = createProgram(DIRECTIVE_WITH_INPUTS_OUTPUTS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ToggleDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      const aliasedInput = directive.inputs!.find((i) => i.name === 'customInput');
      expect(aliasedInput).toBeDefined();
      // Alias extraction depends on decorator arguments parsing
    });

    it('should handle setter-based inputs', () => {
      const { program, sourceFile, typeChecker } = createProgram(STRUCTURAL_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'UnlessDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.inputs).toBeDefined();
      const appUnlessInput = directive.inputs!.find((i) => i.name === 'appUnless');
      expect(appUnlessInput).toBeDefined();
    });
  });

  describe('Providers', () => {
    it('should extract directive providers', () => {
      const code = `
        import { Directive } from '@angular/core';
        import { MyService } from './my-service';

        @Directive({
          selector: '[appWithProviders]',
          providers: [MyService]
        })
        export class WithProvidersDirective {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'WithProvidersDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.providers).toBeDefined();
      expect(directive.providers!.length).toBeGreaterThan(0);
    });

    it('should create provider relationships', () => {
      const code = `
        import { Directive } from '@angular/core';
        import { MyService } from './my-service';

        @Directive({
          selector: '[appWithProviders]',
          providers: [MyService]
        })
        export class WithProvidersDirective {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'WithProvidersDirective');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const providerRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Provides
      );

      expect(providerRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Constructor Dependencies', () => {
    it('should extract constructor dependencies', () => {
      const { program, sourceFile, typeChecker } = createProgram(STRUCTURAL_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'UnlessDirective');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const injectRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Injects
      );

      expect(injectRelationships.length).toBe(2);
      expect(injectRelationships.some((r: any) => r.target === 'TemplateRef<any>')).toBe(true);
      expect(injectRelationships.some((r: any) => r.target === 'ViewContainerRef')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle directive without selector', () => {
      const code = `
        import { Directive } from '@angular/core';

        @Directive({})
        export class NoSelectorDirective {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NoSelectorDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.selector).toBeUndefined();
    });

    it('should handle empty directive', () => {
      const code = `
        import { Directive } from '@angular/core';

        @Directive({
          selector: '[appEmpty]'
        })
        export class EmptyDirective {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'EmptyDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.inputs).toEqual([]);
      expect(directive.outputs).toEqual([]);
    });
  });

  describe('Parser State Management', () => {
    it('should accumulate results across multiple parses', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(2);
    });

    it('should reset state correctly', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(1);

      parser.reset();
      expect(parser.getResults()).toHaveLength(0);
    });

    it('should add entities to context', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      expect(context.entities.size).toBe(1);
      const entity: any = Array.from(context.entities.values())[0];
      expect(entity.name).toBe('HighlightDirective');
    });
  });

  describe('Documentation and Metadata', () => {
    it('should extract JSDoc comments', () => {
      const code = `
        import { Directive } from '@angular/core';

        /**
         * A documented directive
         * @description Highlights elements on hover
         */
        @Directive({
          selector: '[appDoc]'
        })
        export class DocumentedDirective {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DocumentedDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.documentation).toBeDefined();
      expect(directive.documentation).toContain('documented directive');
    });

    it('should extract decorators metadata', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.decorators).toBeDefined();
      expect(directive.decorators!.length).toBeGreaterThan(0);
      expect(directive.decorators![0].name).toBe('Directive');
    });

    it('should extract class modifiers', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_DIRECTIVE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HighlightDirective');
      parser.parse(classNode!, context);

      const directive = parser.getResults()[0];
      expect(directive.modifiers).toBeDefined();
      expect(directive.modifiers!.some((m: string) => m.toLowerCase().includes('export'))).toBe(true);
    });
  });
});
