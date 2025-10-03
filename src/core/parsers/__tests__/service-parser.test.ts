/**
 * Unit tests for ServiceParser
 */

import * as ts from 'typescript';
import { ServiceParser } from '../service-parser';
import { EntityType, RelationType } from '../../../types';
import {
  createProgram,
  findClass,
  createMockContext,
} from '../../../__tests__/helpers/test-utils';
import {
  SIMPLE_SERVICE,
  SERVICE_WITH_DEPENDENCIES,
} from '../../../__tests__/helpers/fixtures';

describe('ServiceParser', () => {
  let parser: ServiceParser;

  beforeEach(() => {
    parser = new ServiceParser();
  });

  describe('Basic Service Parsing', () => {
    it('should parse a simple service', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      expect(classNode).toBeDefined();

      parser.parse(classNode!, context);

      const results = parser.getResults();
      expect(results).toHaveLength(1);

      const service = results[0];
      expect(service.type).toBe(EntityType.Service);
      expect(service.name).toBe('SimpleService');
      expect(service.providedIn).toBe('root');
    });

    it('should generate correct entity ID', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.id).toContain('SimpleService');
      expect(service.id).toContain('service');
    });

    it('should extract location information', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.location).toBeDefined();
      expect(service.location.filePath).toBe('test.ts');
      expect(service.location.line).toBeGreaterThan(0);
    });

    it('should not parse non-injectable classes', () => {
      const code = `
        export class NotAService {
          getData() { return 'data'; }
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NotAService');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(0);
    });
  });

  describe('providedIn Metadata', () => {
    it('should extract providedIn: "root"', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.providedIn).toBe('root');
    });

    it('should extract providedIn: "any"', () => {
      const code = `
        import { Injectable } from '@angular/core';

        @Injectable({
          providedIn: 'any'
        })
        export class AnyService {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'AnyService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.providedIn).toBe('any');
    });

    it('should handle missing providedIn', () => {
      const code = `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class NoProviderService {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NoProviderService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.providedIn).toBeUndefined();
    });
  });

  describe('Dependency Injection', () => {
    it('should extract constructor dependencies', () => {
      const { program, sourceFile, typeChecker } = createProgram(SERVICE_WITH_DEPENDENCIES);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DependentService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.dependencies).toBeDefined();
      expect(service.dependencies!.length).toBe(2);

      const httpDep = service.dependencies!.find((d) => d.type === 'HttpClient');
      expect(httpDep).toBeDefined();
      expect(httpDep!.name).toBe('http');

      const simpleDep = service.dependencies!.find((d) => d.type === 'SimpleService');
      expect(simpleDep).toBeDefined();
      expect(simpleDep!.name).toBe('simpleService');
    });

    it('should create inject relationships', () => {
      const { program, sourceFile, typeChecker } = createProgram(SERVICE_WITH_DEPENDENCIES);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DependentService');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const injectRelationships = relationships.filter(
        (r: any) => r.type === RelationType.Injects
      );

      expect(injectRelationships.length).toBe(2);
      expect(injectRelationships.some((r: any) => r.target === 'HttpClient')).toBe(true);
      expect(injectRelationships.some((r: any) => r.target === 'SimpleService')).toBe(true);
    });

    it('should handle optional dependencies', () => {
      const code = `
        import { Injectable, Optional } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class OptionalDepsService {
          constructor(@Optional() private logger?: LoggerService) {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'OptionalDepsService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      const loggerDep = service.dependencies!.find((d) => d.type === 'LoggerService');
      expect(loggerDep).toBeDefined();
      expect(loggerDep!.optional).toBe(true);
    });

    it('should handle Self decorator', () => {
      const code = `
        import { Injectable, Self } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class SelfService {
          constructor(@Self() private config: ConfigService) {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SelfService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      const configDep = service.dependencies!.find((d) => d.type === 'ConfigService');
      expect(configDep).toBeDefined();
      expect(configDep!.self).toBe(true);
    });

    it('should handle SkipSelf decorator', () => {
      const code = `
        import { Injectable, SkipSelf } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class SkipSelfService {
          constructor(@SkipSelf() private parent: ParentService) {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SkipSelfService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      const parentDep = service.dependencies!.find((d) => d.type === 'ParentService');
      expect(parentDep).toBeDefined();
      expect(parentDep!.skipSelf).toBe(true);
    });

    it('should handle Host decorator', () => {
      const code = `
        import { Injectable, Host } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class HostService {
          constructor(@Host() private container: ContainerService) {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'HostService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      const containerDep = service.dependencies!.find((d) => d.type === 'ContainerService');
      expect(containerDep).toBeDefined();
      expect(containerDep!.host).toBe(true);
    });

    it('should handle services without dependencies', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.dependencies).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle services without constructor', () => {
      const code = `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class NoConstructorService {
          data = 'static data';
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'NoConstructorService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.dependencies).toEqual([]);
    });

    it('should handle constructor with no parameters', () => {
      const code = `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class EmptyConstructorService {
          constructor() {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'EmptyConstructorService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.dependencies).toEqual([]);
    });

    it('should handle malformed Injectable', () => {
      const code = `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class MalformedService {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'MalformedService');

      expect(() => parser.parse(classNode!, context)).not.toThrow();
      expect(parser.getResults()).toHaveLength(1);
    });
  });

  describe('Parser State Management', () => {
    it('should accumulate results across multiple parses', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(2);
    });

    it('should reset state correctly', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      expect(parser.getResults()).toHaveLength(1);

      parser.reset();
      expect(parser.getResults()).toHaveLength(0);
    });

    it('should add entities to context', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      expect(context.entities.size).toBe(1);
      const entity: any = Array.from(context.entities.values())[0];
      expect(entity.name).toBe('SimpleService');
    });
  });

  describe('Documentation and Metadata', () => {
    it('should extract JSDoc comments', () => {
      const code = `
        import { Injectable } from '@angular/core';

        /**
         * A documented service
         * @description Provides data access
         */
        @Injectable({ providedIn: 'root' })
        export class DocumentedService {}
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'DocumentedService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.documentation).toBeDefined();
      expect(service.documentation).toContain('documented service');
    });

    it('should extract decorators metadata', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.decorators).toBeDefined();
      expect(service.decorators!.length).toBeGreaterThan(0);
      expect(service.decorators![0].name).toBe('Injectable');
    });

    it('should extract class modifiers', () => {
      const { program, sourceFile, typeChecker } = createProgram(SIMPLE_SERVICE);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'SimpleService');
      parser.parse(classNode!, context);

      const service = parser.getResults()[0];
      expect(service.modifiers).toBeDefined();
      expect(service.modifiers!.some((m: string) => m.toLowerCase().includes('export'))).toBe(true);
    });
  });

  describe('Relationship Metadata', () => {
    it('should include dependency flags in relationship metadata', () => {
      const code = `
        import { Injectable, Optional, Self } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class FlagsService {
          constructor(
            @Optional() @Self() private config?: ConfigService
          ) {}
        }
      `;

      const { program, sourceFile, typeChecker } = createProgram(code);
      const context = createMockContext(sourceFile, typeChecker, program);

      const classNode = findClass(sourceFile, 'FlagsService');
      parser.parse(classNode!, context);

      const relationships = context.relationships;
      const injectRel: any = relationships.find(
        (r: any) => r.type === RelationType.Injects && r.target === 'ConfigService'
      );

      expect(injectRel).toBeDefined();
      expect(injectRel.metadata.optional).toBe(true);
      expect(injectRel.metadata.self).toBe(true);
    });
  });
});
