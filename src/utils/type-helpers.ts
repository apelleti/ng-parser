/**
 * Type name normalization and extraction utilities
 */

/**
 * Normalize a type name for import resolution
 * Handles arrays, generics, and complex types
 *
 * @param typeName - Raw type string (e.g., "Foo[]", "Array<Bar>", "Observable<T>")
 * @returns Normalized type names that can be used for import lookup
 *
 * @example
 * normalizeTypeName("Foo[]") // ["Foo"]
 * normalizeTypeName("Array<Bar>") // ["Bar"]
 * normalizeTypeName("Observable<User>") // ["Observable", "User"]
 * normalizeTypeName("Foo | Bar") // ["Foo", "Bar"]
 * normalizeTypeName("Map<string, User>") // ["Map", "User"]
 */
export function normalizeTypeName(typeName: string): string[] {
  const types: string[] = [];

  // Handle null/undefined
  if (!typeName || typeName.trim() === '') {
    return [];
  }

  // Remove whitespace
  typeName = typeName.trim();

  // Handle array notation: Type[]
  if (typeName.endsWith('[]')) {
    const baseType = typeName.slice(0, -2).trim();
    return normalizeTypeName(baseType);
  }

  // Handle Array<Type>
  if (typeName.startsWith('Array<') && typeName.endsWith('>')) {
    const innerType = typeName.slice(6, -1).trim();
    return normalizeTypeName(innerType);
  }

  // Handle generic types: Type<T, U>
  const genericMatch = typeName.match(/^([^<]+)<(.+)>$/);
  if (genericMatch) {
    const baseType = genericMatch[1].trim();
    const genericArgs = genericMatch[2];

    // Add base type
    if (baseType && !isPrimitiveType(baseType)) {
      types.push(baseType);
    }

    // Extract generic arguments (split by comma, but respect nested generics)
    const args = extractGenericArgs(genericArgs);
    args.forEach(arg => {
      const normalized = normalizeTypeName(arg);
      types.push(...normalized);
    });

    return types;
  }

  // Handle union types: Foo | Bar
  if (typeName.includes('|')) {
    const unionTypes = typeName.split('|').map(t => t.trim());
    unionTypes.forEach(t => {
      const normalized = normalizeTypeName(t);
      types.push(...normalized);
    });
    return types;
  }

  // Handle intersection types: Foo & Bar
  if (typeName.includes('&')) {
    const intersectionTypes = typeName.split('&').map(t => t.trim());
    intersectionTypes.forEach(t => {
      const normalized = normalizeTypeName(t);
      types.push(...normalized);
    });
    return types;
  }

  // Filter out primitives and built-in types
  if (!isPrimitiveType(typeName)) {
    types.push(typeName);
  }

  return types;
}

/**
 * Extract generic type arguments, handling nested generics
 *
 * @example
 * extractGenericArgs("string, User") // ["string", "User"]
 * extractGenericArgs("Map<string, User>, number") // ["Map<string, User>", "number"]
 */
function extractGenericArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of argsStr) {
    if (char === '<') {
      depth++;
      current += char;
    } else if (char === '>') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        args.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Check if a type is a primitive or built-in type that shouldn't be looked up in imports
 */
function isPrimitiveType(typeName: string): boolean {
  const primitives = new Set([
    'string',
    'number',
    'boolean',
    'any',
    'void',
    'null',
    'undefined',
    'never',
    'unknown',
    'object',
    'symbol',
    'bigint',
  ]);

  return primitives.has(typeName.toLowerCase());
}

/**
 * Get the primary type name from a complex type
 * Returns the most significant type for import resolution
 *
 * @example
 * getPrimaryTypeName("Foo[]") // "Foo"
 * getPrimaryTypeName("Observable<User>") // "Observable"
 * getPrimaryTypeName("Foo | Bar") // "Foo"
 */
export function getPrimaryTypeName(typeName: string): string | undefined {
  const normalized = normalizeTypeName(typeName);
  return normalized.length > 0 ? normalized[0] : undefined;
}
