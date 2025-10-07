/**
 * Registry of known Angular @Input attributes to distinguish them from directive selectors.
 *
 * Problem: When parsing templates, we encounter both:
 * 1. Directive selectors (e.g., matButton, cdkOverlay) - should create relationships
 * 2. @Input attributes (e.g., color, dataSource) - should NOT create relationships
 *
 * This registry helps filter out @Input attributes to avoid false "unresolved" relations.
 */
export class InputAttributeRegistry {
  /**
   * Known @Input attributes extracted from analysis of 231 false "unresolved" relations.
   * These are common @Input properties on Material and CDK components.
   */
  private readonly knownAttributes = new Set<string>([
    // Form-related inputs
    'formControl',
    'formGroup',
    'formControlName',
    'formGroupName',
    'formArrayName',

    // Material appearance/styling
    'color',
    'appearance',
    'mode',
    'state',
    'orientation',

    // Data binding
    'dataSource',

    // CDK specific
    'cdkTreeNodeTypeaheadLabel',
    'skipDisabled',

    // Material-specific @Input properties (not directive selectors)
    'matTooltip',
    'matTooltipPosition',
    'matTooltipClass',
    'matBadge',
    'matBadgeColor',
    'matBadgePosition',
    'matRipple',
    'matRippleColor',
    'matRippleCentered',

    // Common Angular inputs
    'disabled',
    'required',
    'readonly',
    'placeholder',
    'value',
    'checked',
    'selected',
    'multiple',
    'step',
    'min',
    'max',
    'minlength',
    'maxlength',
    'pattern',
    'tabindex',
  ]);

  /**
   * Patterns that match @Input attributes dynamically.
   * These catch common naming conventions for Angular inputs.
   */
  private readonly dynamicPatterns = [
    /^ng[A-Z]/,           // ngModel, ngClass, ngStyle, ngIf, ngFor, etc.
    /^cdkTree[A-Z]/,      // CDK Tree directives with inputs
  ];

  /**
   * Check if a name is likely an @Input attribute rather than a directive selector.
   *
   * @param name - The attribute/selector name to check
   * @returns true if this is likely an @Input attribute, false if it's likely a directive selector
   *
   * @example
   * registry.isInputAttribute('dataSource')  // true (known @Input)
   * registry.isInputAttribute('color')       // true (known @Input)
   * registry.isInputAttribute('matButton')   // false (directive selector)
   * registry.isInputAttribute('ngModel')     // true (matches ng* pattern)
   */
  isInputAttribute(name: string): boolean {
    // Check against known attributes first (most common case)
    if (this.knownAttributes.has(name)) {
      return true;
    }

    // Check against dynamic patterns
    return this.dynamicPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Add a custom @Input attribute to the registry.
   * Useful for project-specific inputs.
   *
   * @param name - The @Input attribute name to register
   */
  addAttribute(name: string): void {
    this.knownAttributes.add(name);
  }

  /**
   * Add multiple custom @Input attributes at once.
   *
   * @param names - Array of @Input attribute names to register
   */
  addAttributes(names: string[]): void {
    names.forEach(name => this.knownAttributes.add(name));
  }

  /**
   * Get all registered known attributes (for debugging/inspection).
   *
   * @returns Array of all known @Input attribute names
   */
  getKnownAttributes(): string[] {
    return Array.from(this.knownAttributes).sort();
  }
}

// Export singleton instance for use across the codebase
export const inputAttributeRegistry = new InputAttributeRegistry();
