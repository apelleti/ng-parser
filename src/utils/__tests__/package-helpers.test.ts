/**
 * Tests for package.json utilities
 */

import { describe, it, expect } from '@jest/globals';
import { loadPackageJson, isExternalPackage, extractPackageName, getAllDependencies } from '../package-helpers.js';
import * as path from 'path';

describe('package-helpers', () => {
  describe('extractPackageName', () => {
    it('should extract scoped package name', () => {
      expect(extractPackageName('@angular/core')).toBe('@angular/core');
      expect(extractPackageName('@angular/core/testing')).toBe('@angular/core');
      expect(extractPackageName('@ngrx/store')).toBe('@ngrx/store');
      expect(extractPackageName('@ngrx/store/effects')).toBe('@ngrx/store');
    });

    it('should extract regular package name', () => {
      expect(extractPackageName('lodash')).toBe('lodash');
      expect(extractPackageName('lodash/debounce')).toBe('lodash');
      expect(extractPackageName('rxjs')).toBe('rxjs');
      expect(extractPackageName('rxjs/operators')).toBe('rxjs');
    });
  });

  describe('loadPackageJson', () => {
    it('should load package.json from project root', () => {
      const rootDir = path.resolve(__dirname, '../../..');
      const packageInfo = loadPackageJson(rootDir);

      expect(packageInfo).not.toBeNull();
      expect(packageInfo?.name).toBe('@ttwtf/ng-parser');
      expect(packageInfo?.dependencies).toBeDefined();
    });

    it('should return null for non-existent package.json', () => {
      const packageInfo = loadPackageJson('/nonexistent/path');
      expect(packageInfo).toBeNull();
    });
  });

  describe('isExternalPackage', () => {
    const mockPackageInfo = {
      name: 'test-app',
      dependencies: {
        '@angular/core': '^19.0.0',
        'lodash': '^4.17.21',
      },
      devDependencies: {
        'typescript': '^5.0.0',
      },
      peerDependencies: {},
    };

    it('should detect external packages in dependencies', () => {
      expect(isExternalPackage('@angular/core', mockPackageInfo)).toBe(true);
      expect(isExternalPackage('@angular/core/testing', mockPackageInfo)).toBe(true);
      expect(isExternalPackage('lodash', mockPackageInfo)).toBe(true);
      expect(isExternalPackage('lodash/debounce', mockPackageInfo)).toBe(true);
    });

    it('should detect external packages in devDependencies', () => {
      expect(isExternalPackage('typescript', mockPackageInfo)).toBe(true);
    });

    it('should return false for internal imports', () => {
      expect(isExternalPackage('./service', mockPackageInfo)).toBe(false);
      expect(isExternalPackage('../module', mockPackageInfo)).toBe(false);
      expect(isExternalPackage('@app/services', mockPackageInfo)).toBe(false);
    });

    it('should return false when packageInfo is null', () => {
      expect(isExternalPackage('@angular/core', null)).toBe(false);
    });
  });

  describe('getAllDependencies', () => {
    it('should return all dependencies', () => {
      const mockPackageInfo = {
        dependencies: { 'pkg1': '1.0.0', 'pkg2': '2.0.0' },
        devDependencies: { 'dev-pkg': '3.0.0' },
        peerDependencies: { 'peer-pkg': '4.0.0' },
      };

      const allDeps = getAllDependencies(mockPackageInfo);
      expect(allDeps).toContain('pkg1');
      expect(allDeps).toContain('pkg2');
      expect(allDeps).toContain('dev-pkg');
      expect(allDeps).toContain('peer-pkg');
      expect(allDeps.length).toBe(4);
    });

    it('should return empty array when packageInfo is null', () => {
      expect(getAllDependencies(null)).toEqual([]);
    });
  });
});
