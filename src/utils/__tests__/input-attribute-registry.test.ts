import { describe, it, expect, beforeEach } from '@jest/globals';
import { InputAttributeRegistry } from '../input-attribute-registry.js';

describe('InputAttributeRegistry', () => {
  let registry: InputAttributeRegistry;

  beforeEach(() => {
    registry = new InputAttributeRegistry();
  });

  describe('Known @Input Attributes', () => {
    it('should identify form-related inputs', () => {
      expect(registry.isInputAttribute('formControl')).toBe(true);
      expect(registry.isInputAttribute('formGroup')).toBe(true);
      expect(registry.isInputAttribute('formControlName')).toBe(true);
      expect(registry.isInputAttribute('formGroupName')).toBe(true);
      expect(registry.isInputAttribute('formArrayName')).toBe(true);
    });

    it('should identify Material appearance/styling inputs', () => {
      expect(registry.isInputAttribute('color')).toBe(true);
      expect(registry.isInputAttribute('appearance')).toBe(true);
      expect(registry.isInputAttribute('mode')).toBe(true);
      expect(registry.isInputAttribute('state')).toBe(true);
      expect(registry.isInputAttribute('orientation')).toBe(true);
    });

    it('should identify data binding inputs', () => {
      expect(registry.isInputAttribute('dataSource')).toBe(true);
    });

    it('should identify CDK-specific inputs', () => {
      expect(registry.isInputAttribute('cdkTreeNodeTypeaheadLabel')).toBe(true);
      expect(registry.isInputAttribute('skipDisabled')).toBe(true);
    });

    it('should identify common Angular inputs', () => {
      expect(registry.isInputAttribute('disabled')).toBe(true);
      expect(registry.isInputAttribute('required')).toBe(true);
      expect(registry.isInputAttribute('readonly')).toBe(true);
      expect(registry.isInputAttribute('placeholder')).toBe(true);
      expect(registry.isInputAttribute('value')).toBe(true);
      expect(registry.isInputAttribute('checked')).toBe(true);
      expect(registry.isInputAttribute('selected')).toBe(true);
      expect(registry.isInputAttribute('multiple')).toBe(true);
      expect(registry.isInputAttribute('step')).toBe(true);
      expect(registry.isInputAttribute('min')).toBe(true);
      expect(registry.isInputAttribute('max')).toBe(true);
      expect(registry.isInputAttribute('minlength')).toBe(true);
      expect(registry.isInputAttribute('maxlength')).toBe(true);
      expect(registry.isInputAttribute('pattern')).toBe(true);
      expect(registry.isInputAttribute('tabindex')).toBe(true);
    });
  });

  describe('Dynamic Pattern Matching', () => {
    it('should identify ng* attributes', () => {
      expect(registry.isInputAttribute('ngModel')).toBe(true);
      expect(registry.isInputAttribute('ngClass')).toBe(true);
      expect(registry.isInputAttribute('ngStyle')).toBe(true);
      expect(registry.isInputAttribute('ngIf')).toBe(true);
      expect(registry.isInputAttribute('ngFor')).toBe(true);
      expect(registry.isInputAttribute('ngSwitch')).toBe(true);
    });

    it('should identify cdkTree* attributes', () => {
      expect(registry.isInputAttribute('cdkTreeNode')).toBe(true);
      expect(registry.isInputAttribute('cdkTreeNodeDef')).toBe(true);
    });

    it('should identify known mat* property attributes', () => {
      // These are explicitly listed as known @Input attributes
      expect(registry.isInputAttribute('matTooltip')).toBe(true);
      expect(registry.isInputAttribute('matBadge')).toBe(true);
      expect(registry.isInputAttribute('matRipple')).toBe(true);
    });
  });

  describe('Negative Cases - Should NOT Match', () => {
    it('should not identify directive selectors', () => {
      expect(registry.isInputAttribute('matButton')).toBe(false);
      expect(registry.isInputAttribute('cdkOverlay')).toBe(false);
      expect(registry.isInputAttribute('appCustomDirective')).toBe(false);
    });

    it('should not identify component selectors', () => {
      expect(registry.isInputAttribute('mat-form-field')).toBe(false);
      expect(registry.isInputAttribute('app-custom-component')).toBe(false);
    });

    it('should not identify random strings', () => {
      expect(registry.isInputAttribute('randomAttr')).toBe(false);
      expect(registry.isInputAttribute('fooBar')).toBe(false);
      expect(registry.isInputAttribute('test123')).toBe(false);
    });
  });

  describe('Custom Attributes', () => {
    it('should allow adding custom attributes', () => {
      expect(registry.isInputAttribute('customInput')).toBe(false);

      registry.addAttribute('customInput');

      expect(registry.isInputAttribute('customInput')).toBe(true);
    });

    it('should allow adding multiple custom attributes', () => {
      const customAttrs = ['customInput1', 'customInput2', 'customInput3'];

      expect(registry.isInputAttribute('customInput1')).toBe(false);
      expect(registry.isInputAttribute('customInput2')).toBe(false);

      registry.addAttributes(customAttrs);

      expect(registry.isInputAttribute('customInput1')).toBe(true);
      expect(registry.isInputAttribute('customInput2')).toBe(true);
      expect(registry.isInputAttribute('customInput3')).toBe(true);
    });
  });

  describe('getKnownAttributes', () => {
    it('should return all known attributes sorted', () => {
      const knownAttrs = registry.getKnownAttributes();

      expect(Array.isArray(knownAttrs)).toBe(true);
      expect(knownAttrs.length).toBeGreaterThan(0);
      expect(knownAttrs).toContain('color');
      expect(knownAttrs).toContain('dataSource');
      expect(knownAttrs).toContain('formControl');

      // Check that it's sorted
      const sorted = [...knownAttrs].sort();
      expect(knownAttrs).toEqual(sorted);
    });

    it('should include custom attributes', () => {
      registry.addAttribute('myCustomInput');

      const knownAttrs = registry.getKnownAttributes();

      expect(knownAttrs).toContain('myCustomInput');
    });
  });

  describe('Real-World Cases from Analysis', () => {
    it('should handle the 231 false "unresolved" cases', () => {
      // These were the most common false positives identified in the analysis
      const falsePositives = [
        'dataSource',      // 69 occurrences
        'formControl',     // 57 occurrences
        'color',           // 35 occurrences
        'appearance',      // 23 occurrences
        'orientation',
        'mode',
        'state',
        'skipDisabled',
        'cdkTreeNodeTypeaheadLabel',
      ];

      falsePositives.forEach(attr => {
        expect(registry.isInputAttribute(attr)).toBe(true);
      });
    });

    it('should allow directive selectors to pass through', () => {
      // These should NOT be filtered (they are real directives)
      const realDirectives = [
        'cdkOverlay',
        'cdkPortal',
        'matMenu',
        'matSort',
        'matExpansionPanel',
      ];

      realDirectives.forEach(directive => {
        expect(registry.isInputAttribute(directive)).toBe(false);
      });
    });
  });
});
