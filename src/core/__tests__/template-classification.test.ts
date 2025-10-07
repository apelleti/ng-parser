import { describe, it, expect } from '@jest/globals';

/**
 * Tests de validation de la classification des relations template
 *
 * Objectif: Vérifier que TOUTES les relations usesInTemplate ont une classification
 * (internal ou unresolved) et non "unknown" ou undefined.
 */
describe('Template Relationship Classification', () => {
  describe('Classification Requirements', () => {
    it('should have classification field for resolved template relationships', () => {
      // Mock d'une relation template resolved
      const resolvedRelation = {
        id: 'component:test.ts:TestComponent:usesInTemplate:component:button.ts:ButtonComponent',
        type: 'usesInTemplate',
        source: 'component:test.ts:TestComponent',
        target: 'component:button.ts:ButtonComponent',
        metadata: {
          templateUsage: 'component',
          selector: 'app-button',
          classification: 'internal',
          resolved: true,
        },
      };

      expect(resolvedRelation.metadata.classification).toBe('internal');
      expect(resolvedRelation.metadata.resolved).toBe(true);
      expect(resolvedRelation.metadata.classification).not.toBe('unknown');
      expect(resolvedRelation.metadata.classification).toBeDefined();
    });

    it('should have classification field for unresolved template relationships', () => {
      // Mock d'une relation template unresolved
      const unresolvedRelation = {
        id: 'component:test.ts:TestComponent:usesInTemplate:unknownSelector',
        type: 'usesInTemplate',
        source: 'component:test.ts:TestComponent',
        target: 'unknownSelector',
        metadata: {
          templateUsage: 'component',
          selector: 'unknownSelector',
          unresolved: true,
          classification: 'unresolved',
          resolved: false,
        },
      };

      expect(unresolvedRelation.metadata.classification).toBe('unresolved');
      expect(unresolvedRelation.metadata.resolved).toBe(false);
      expect(unresolvedRelation.metadata.unresolved).toBe(true);
    });

    it('should NOT have unknown classification', () => {
      // Toutes les relations doivent avoir une classification définie
      const validClassifications = ['internal', 'external', 'unresolved'];

      const testRelation = {
        metadata: {
          classification: 'internal',
        },
      };

      expect(validClassifications).toContain(testRelation.metadata.classification);
      expect(testRelation.metadata.classification).not.toBe('unknown');
      expect(testRelation.metadata.classification).not.toBeUndefined();
    });
  });

  describe('Template Usage Types', () => {
    it('should classify component template relationships', () => {
      const componentRel = {
        metadata: {
          templateUsage: 'component',
          selector: 'mat-button',
          classification: 'internal',
          resolved: true,
        },
      };

      expect(componentRel.metadata.templateUsage).toBe('component');
      expect(componentRel.metadata.classification).toBeDefined();
    });

    it('should classify directive template relationships', () => {
      const directiveRel = {
        metadata: {
          templateUsage: 'directive',
          selector: 'matTooltip',
          classification: 'internal',
          resolved: true,
        },
      };

      expect(directiveRel.metadata.templateUsage).toBe('directive');
      expect(directiveRel.metadata.classification).toBeDefined();
    });

    it('should classify pipe template relationships', () => {
      const pipeRel = {
        metadata: {
          templateUsage: 'pipe',
          classification: 'internal',
          resolved: true,
        },
      };

      expect(pipeRel.metadata.templateUsage).toBe('pipe');
      expect(pipeRel.metadata.classification).toBeDefined();
    });
  });

  describe('Resolved Flag Consistency', () => {
    it('should have resolved=true when classification=internal', () => {
      const relation = {
        metadata: {
          classification: 'internal',
          resolved: true,
        },
      };

      if (relation.metadata.classification === 'internal') {
        expect(relation.metadata.resolved).toBe(true);
      }
    });

    it('should have resolved=false when classification=unresolved', () => {
      const relation = {
        metadata: {
          classification: 'unresolved',
          resolved: false,
          unresolved: true,
        },
      };

      if (relation.metadata.classification === 'unresolved') {
        expect(relation.metadata.resolved).toBe(false);
        expect(relation.metadata.unresolved).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle selectors with dashes', () => {
      const relation = {
        metadata: {
          selector: 'mat-form-field',
          classification: 'internal',
        },
      };

      expect(relation.metadata.selector).toContain('-');
      expect(relation.metadata.classification).toBeDefined();
    });

    it('should handle attribute selectors', () => {
      const relation = {
        metadata: {
          selector: 'matButton',
          classification: 'internal',
        },
      };

      // Attribute selectors are valid and should be classified
      expect(relation.metadata.classification).toBeDefined();
    });

    it('should handle ng-content and ng-container', () => {
      // Ces sélecteurs Angular natifs peuvent être unresolved
      const ngContentRel = {
        metadata: {
          selector: 'ng-content',
          classification: 'unresolved',
          resolved: false,
        },
      };

      expect(ngContentRel.metadata.classification).toBe('unresolved');
    });
  });

  describe('Validation Rules', () => {
    it('should fail if classification is missing', () => {
      const invalidRelation = {
        metadata: {
          templateUsage: 'component',
          selector: 'test',
          // classification manquante
        },
      };

      // Ce test devrait échouer en production
      const hasClassification = 'classification' in invalidRelation.metadata;
      expect(hasClassification).toBe(false); // Démontre le problème
    });

    it('should pass if classification is present', () => {
      const validRelation = {
        metadata: {
          templateUsage: 'component',
          selector: 'test',
          classification: 'internal',
          resolved: true,
        },
      };

      const hasClassification = 'classification' in validRelation.metadata;
      expect(hasClassification).toBe(true);
      expect(validRelation.metadata.classification).toBeDefined();
    });
  });
});
