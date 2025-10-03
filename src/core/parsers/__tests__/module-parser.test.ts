/**
 * Unit tests for ModuleParser
 */

import * as ts from 'typescript';
import { ModuleParser } from '../module-parser.js';
import { EntityType, RelationType } from '../../../types/index.js';
import {
  createProgram,
  findClass,
  createMockContext,
} from '../../../__tests__/helpers/test-utils.js';
import {
  SIMPLE_MODULE,
  MODULE_WITH_PROVIDERS,
} from '../../../__tests__/helpers/fixtures.js';

describe('ModuleParser', () => {
  let parser: ModuleParser;

  beforeEach(() => {
    parser = new ModuleParser();
  });

  describe('Basic Module Parsing', () => {
    it('should parse a simple module', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      expect(classNode).toBeDefined();

      parser.parse(classNode!, context);

      const results = parser.getResults();
      expect(results).toHaveLength(1);

      const module = results[0];
      expect(module.type).toBe(EntityType.Module);
      expect(module.name).toBe('SimpleModule');
    });

    it('should generate correct entity ID', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.id).toContain('SimpleModule');
      expect(module.id).toContain('module');
    });

    it('should extract location information', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.location).toBeDefined();
      expect(module.location.filePath).toBe('test.ts');
      expect(module.location.line).toBeGreaterThan(0);
    });

    it('should not parse non-module classes', () => {
      const code = `
        export class NotAModule {
          // Just a regular class
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NotAModule');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(0);
    });
  });

  describe('Module Metadata', () => {
    it('should extract declarations', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.declarations).toBeDefined();
      expect(module.declarations).toContain('SimpleComponent');
      expect(module.declarations).toContain('IoComponent');
    });

    it('should extract imports', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.imports).toBeDefined();
      expect(module.imports).toContain('CommonModule');
    });

    it('should extract exports', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.exports).toBeDefined();
      expect(module.exports).toContain('SimpleComponent');
    });

    it('should extract providers', () => {
      const { program, sourceFile, typeChecker } = createProgram(MODULE_WITH_PROVIDERS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ConfigModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.providers).toBeDefined();
      expect(module.providers!.length).toBeGreaterThan(0);
    });

    it('should extract bootstrap', () => {
      const code = `
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [AppComponent],
          bootstrap: [AppComponent]
        })
        export class AppModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'AppModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.bootstrap).toBeDefined();
      expect(module.bootstrap).toContain('AppComponent');
    });
  });

  describe('Relationships', () => {
    it('should create declares relationships', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const declaresRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Declares
      );

      expect(declaresRelationships.length).toBeGreaterThan(0);
      expect(declaresRelationships.some((r: any) => r.target === 'SimpleComponent')).toBe(true);
      expect(declaresRelationships.some((r: any) => r.target === 'IoComponent')).toBe(true);
    });

    it('should create imports relationships', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const importsRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Imports
      );

      expect(importsRelationships.length).toBeGreaterThan(0);
      expect(importsRelationships.some((r: any) => r.target === 'CommonModule')).toBe(true);
    });

    it('should create exports relationships', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const exportsRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Exports
      );

      expect(exportsRelationships.length).toBeGreaterThan(0);
      expect(exportsRelationships.some((r: any) => r.target === 'SimpleComponent')).toBe(true);
    });

    it('should create provides relationships', () => {
      const { program, sourceFile, typeChecker } = createProgram(MODULE_WITH_PROVIDERS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ConfigModule');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const providesRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Provides
      );

      expect(providesRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty module', () => {
      const code = `
        import { NgModule } from '@angular/core';

        @NgModule({})
        export class EmptyModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'EmptyModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.declarations).toBeUndefined();
      expect(module.imports).toBeUndefined();
      expect(module.exports).toBeUndefined();
      expect(module.providers).toBeUndefined();
      expect(module.bootstrap).toBeUndefined();
    });

    it('should handle module with only declarations', () => {
      const code = `
        import { NgModule } from '@angular/core';

        @NgModule({
          declarations: [MyComponent]
        })
        export class DeclarationsOnlyModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DeclarationsOnlyModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.declarations).toContain('MyComponent');
      expect(module.imports).toBeUndefined();
    });

    it('should handle module with only providers', () => {
      const { program, sourceFile, typeChecker } = createProgram(MODULE_WITH_PROVIDERS);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'ConfigModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.providers).toBeDefined();
      expect(module.declarations).toBeUndefined();
    });

    it('should handle malformed module', () => {
      const code = `
        import { NgModule } from '@angular/core';

        @NgModule()
        export class MalformedModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'MalformedModule');

      expect(() => parser.parse(classNode!, context)).not.toThrow();
      expect(parser.getResults()).toHaveLength(1);
    });
  });

  describe('Parser State Management', () => {
    it('should accumulate results across multiple parses', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(2);
    });

    it('should reset state correctly', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(1);

      parser.reset();
      expect(parser.getResults()).toHaveLength(0);
    });

    it('should add entities to context', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      expect(context.entities.size).toBe(1);
      const entity: any = Array.from(context.entities.values())[0];
      expect(entity.name).toBe('SimpleModule');
    });
  });

  describe('Documentation and Metadata', () => {
    it('should extract JSDoc comments', () => {
      const code = `
        import { NgModule } from '@angular/core';

        /**
         * Application root module
         * @description Contains all feature modules
         */
        @NgModule({
          imports: [CommonModule]
        })
        export class DocumentedModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DocumentedModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.documentation).toBeDefined();
      expect(module.documentation).toContain('root module');
    });

    it('should extract decorators metadata', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.decorators).toBeDefined();
      expect(module.decorators!.length).toBeGreaterThan(0);
      expect(module.decorators![0].name).toBe('NgModule');
    });

    it('should extract class modifiers', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_MODULE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.modifiers).toBeDefined();
      expect(module.modifiers!.some((m: string) => m.toLowerCase().includes('export'))).toBe(true);
    });
  });

  describe('Complex Modules', () => {
    it('should handle feature module with routing', () => {
      const code = `
        import { NgModule } from '@angular/core';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [FeatureComponent],
          imports: [CommonModule, RouterModule.forChild(routes)],
          exports: [FeatureComponent]
        })
        export class FeatureModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'FeatureModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.declarations).toContain('FeatureComponent');
      expect(module.imports).toBeDefined();
      expect(module.exports).toContain('FeatureComponent');
    });

    it('should handle shared module', () => {
      const code = `
        import { NgModule } from '@angular/core';

        @NgModule({
          declarations: [SharedComponent, SharedDirective, SharedPipe],
          imports: [CommonModule],
          exports: [SharedComponent, SharedDirective, SharedPipe, CommonModule]
        })
        export class SharedModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SharedModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.declarations!.length).toBe(3);
      expect(module.exports!.length).toBe(4);
    });

    it('should handle core module', () => {
      const code = `
        import { NgModule } from '@angular/core';

        @NgModule({
          providers: [
            AuthService,
            LoggerService,
            { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
          ]
        })
        export class CoreModule {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'CoreModule');
      parser.parse(classNode!, context);

      const module = parser.getResults()[0];
      expect(module.providers).toBeDefined();
      expect(module.providers!.length).toBeGreaterThan(0);
    });
  });
});
