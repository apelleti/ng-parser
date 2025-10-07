/**
 * Registry of Angular built-in directives, pipes, and components
 * These are part of Angular core and should not be marked as unresolved
 */

/**
 * Angular built-in structural directives
 */
export const ANGULAR_STRUCTURAL_DIRECTIVES = new Set([
  'ng-template',
  'ng-container',
  'ng-content',
]);

/**
 * Angular built-in directives (attribute selectors)
 */
export const ANGULAR_BUILTIN_DIRECTIVES = new Set([
  // Common directives
  'ngIf',
  'ngFor',
  'ngForOf',
  'ngSwitch',
  'ngSwitchCase',
  'ngSwitchDefault',
  'ngTemplateOutlet',
  'ngTemplateOutletContext',
  'ngComponentOutlet',

  // Class/Style directives
  'ngClass',
  'ngStyle',

  // Model directives
  'ngModel',
  'ngModelGroup',
  'ngModelOptions',

  // Form directives
  'ngForm',
  'ngSubmit',

  // Pluralization
  'ngPlural',
  'ngPluralCase',
]);

/**
 * Angular built-in pipes
 */
export const ANGULAR_BUILTIN_PIPES = new Set([
  // Common pipes
  'async',
  'date',
  'json',
  'slice',
  'uppercase',
  'lowercase',
  'titlecase',

  // Number pipes
  'number',
  'percent',
  'currency',
  'decimal',

  // I18n pipes
  'i18nPlural',
  'i18nSelect',

  // Key-value pipe
  'keyvalue',
]);

/**
 * Check if a selector is an Angular built-in structural element
 */
export function isAngularStructuralElement(selector: string): boolean {
  return ANGULAR_STRUCTURAL_DIRECTIVES.has(selector.toLowerCase());
}

/**
 * Check if a directive name is an Angular built-in directive
 */
export function isAngularBuiltinDirective(directiveName: string): boolean {
  return ANGULAR_BUILTIN_DIRECTIVES.has(directiveName);
}

/**
 * Check if a pipe name is an Angular built-in pipe
 */
export function isAngularBuiltinPipe(pipeName: string): boolean {
  return ANGULAR_BUILTIN_PIPES.has(pipeName);
}

/**
 * Check if a selector/name is any kind of Angular built-in
 */
export function isAngularBuiltin(name: string): boolean {
  return (
    isAngularStructuralElement(name) ||
    isAngularBuiltinDirective(name) ||
    isAngularBuiltinPipe(name)
  );
}

/**
 * Get the type of Angular built-in (for classification)
 */
export function getAngularBuiltinType(name: string): 'structural' | 'directive' | 'pipe' | null {
  if (isAngularStructuralElement(name)) return 'structural';
  if (isAngularBuiltinDirective(name)) return 'directive';
  if (isAngularBuiltinPipe(name)) return 'pipe';
  return null;
}
