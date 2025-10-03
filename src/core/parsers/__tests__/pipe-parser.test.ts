/**
 * Unit tests for PipeParser
 */

import * as ts from 'typescript';
import { PipeParser } from '../pipe-parser';
import { EntityType } from '../../../types';
import {
  createProgram,
  findClass,
  createMockContext,
} from '../../../__tests__/helpers/test-utils';
import {
  SIMPLE_PIPE,
  IMPURE_PIPE,
  STANDALONE_PIPE,
} from '../../../__tests__/helpers/fixtures';

describe('PipeParser', () => {
  let parser: PipeParser;

  beforeEach(() => {
    parser = new PipeParser();
  });

  describe('Basic Pipe Parsing', () => {
    it('should parse a simple pipe', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      expect(classNode).toBeDefined();

      parser.parse(classNode!, context);

      const results = parser.getResults();
      expect(results).toHaveLength(1);

      const pipe = results[0];
      expect(pipe.type).toBe(EntityType.Pipe);
      expect(pipe.name).toBe('CapitalizePipe');
      expect(pipe.pipeName).toBe('capitalize');
      expect(pipe.pure).toBe(true);
      expect(pipe.standalone).toBe(false);
    });

    it('should generate correct entity ID', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.id).toContain('CapitalizePipe');
      expect(pipe.id).toContain('pipe');
    });

    it('should extract location information', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.location).toBeDefined();
      expect(pipe.location.filePath).toBe('test.ts');
      expect(pipe.location.line).toBeGreaterThan(0);
    });

    it('should not parse non-pipe classes', () => {
      const code = `
        export class NotAPipe {
          transform(value: string): string {
            return value;
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NotAPipe');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(0);
    });
  });

  describe('Pure and Impure Pipes', () => {
    it('should detect pure pipe', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pure).toBe(true);
    });

    it('should detect impure pipe', () => {
      const { program, sourceFile, typeChecker } = createProgram(IMPURE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'FilterPipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pure).toBe(false);
      expect(pipe.pipeName).toBe('filter');
    });

    it('should default to pure when not specified', () => {
      const code = `
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({
          name: 'defaultPure'
        })
        export class DefaultPurePipe implements PipeTransform {
          transform(value: any): any {
            return value;
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DefaultPurePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pure).toBe(true);
    });
  });

  describe('Standalone Pipes', () => {
    it('should parse standalone pipe', () => {
      const { program, sourceFile, typeChecker } = createProgram(STANDALONE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ReversePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.standalone).toBe(true);
      expect(pipe.pipeName).toBe('reverse');
      expect(pipe.pure).toBe(true);
    });

    it('should default standalone to false', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.standalone).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pipe without name', () => {
      const code = `
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({})
        export class NoNamePipe implements PipeTransform {
          transform(value: any): any {
            return value;
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NoNamePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pipeName).toBeUndefined();
    });

    it('should handle malformed pipe', () => {
      const code = `
        import { Pipe } from '@angular/core';

        @Pipe()
        export class MalformedPipe {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'MalformedPipe');

      expect(() => parser.parse(classNode!, context)).not.toThrow();
      expect(parser.getResults()).toHaveLength(1);
    });
  });

  describe('Parser State Management', () => {
    it('should accumulate results across multiple parses', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(2);
    });

    it('should reset state correctly', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(1);

      parser.reset();
      expect(parser.getResults()).toHaveLength(0);
    });

    it('should add entities to context', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      expect(context.entities.size).toBe(1);
      const entity: any = Array.from(context.entities.values())[0];
      expect(entity.name).toBe('CapitalizePipe');
    });
  });

  describe('Documentation and Metadata', () => {
    it('should extract JSDoc comments', () => {
      const code = `
        import { Pipe, PipeTransform } from '@angular/core';

        /**
         * A documented pipe
         * @description Transforms text to uppercase
         */
        @Pipe({
          name: 'upper'
        })
        export class DocumentedPipe implements PipeTransform {
          transform(value: string): string {
            return value.toUpperCase();
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DocumentedPipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.documentation).toBeDefined();
      expect(pipe.documentation).toContain('documented pipe');
    });

    it('should extract decorators metadata', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.decorators).toBeDefined();
      expect(pipe.decorators!.length).toBeGreaterThan(0);
      expect(pipe.decorators![0].name).toBe('Pipe');
    });

    it('should extract class modifiers', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_PIPE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CapitalizePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.modifiers).toBeDefined();
      expect(pipe.modifiers!.some((m: string) => m.toLowerCase().includes('export'))).toBe(true);
    });
  });

  describe('Complex Pipes', () => {
    it('should handle async pipe pattern', () => {
      const code = `
        import { Pipe, PipeTransform } from '@angular/core';
        import { Observable } from 'rxjs';

        @Pipe({
          name: 'customAsync',
          pure: false
        })
        export class CustomAsyncPipe implements PipeTransform {
          transform(obj: Observable<any>): any {
            return obj;
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CustomAsyncPipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pipeName).toBe('customAsync');
      expect(pipe.pure).toBe(false);
    });

    it('should handle parameterized pipe', () => {
      const code = `
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({
          name: 'truncate',
          pure: true
        })
        export class TruncatePipe implements PipeTransform {
          transform(value: string, limit: number = 10, ellipsis: string = '...'): string {
            return value.length > limit ? value.substring(0, limit) + ellipsis : value;
          }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'TruncatePipe');
      parser.parse(classNode!, context);

      const pipe = parser.getResults()[0];
      expect(pipe.pipeName).toBe('truncate');
      expect(pipe.name).toBe('TruncatePipe');
    });
  });
});
