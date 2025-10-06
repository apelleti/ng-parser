/**
 * Optimization helpers for reducing output size
 */

/**
 * Remove empty arrays and default values from an object
 */
export function removeEmptyDefaults(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeEmptyDefaults).filter((item) => item !== undefined);
  }

  const cleaned: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined and null
    if (value === undefined || value === null) {
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // Skip empty arrays
      if (value.length === 0) {
        continue;
      }
      // Keep arrays with content (recursively clean)
      cleaned[key] = value.map(removeEmptyDefaults);
      continue;
    }

    // Recursively clean nested objects
    if (typeof value === 'object') {
      const cleanedNested = removeEmptyDefaults(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
      continue;
    }

    // Keep all other primitive values
    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * Optimize input metadata by removing redundant fields
 */
export function optimizeInputMetadata(input: any): any {
  const optimized: any = {
    name: input.name,
  };

  // Only include propertyName if different from name
  if (input.propertyName && input.propertyName !== input.name) {
    optimized.propertyName = input.propertyName;
  }

  // Include type if present
  if (input.type) {
    optimized.type = input.type;
  }

  // Only include required if true
  if (input.required === true) {
    optimized.required = true;
  }

  // Only include isSignal if true
  if (input.isSignal === true) {
    optimized.isSignal = true;
  }

  // Include other fields if present
  if (input.defaultValue !== undefined) {
    optimized.defaultValue = input.defaultValue;
  }
  if (input.alias) {
    optimized.alias = input.alias;
  }

  return optimized;
}

/**
 * Optimize output metadata by removing redundant fields
 */
export function optimizeOutputMetadata(output: any): any {
  const optimized: any = {
    name: output.name,
  };

  // Only include propertyName if different from name
  if (output.propertyName && output.propertyName !== output.name) {
    optimized.propertyName = output.propertyName;
  }

  // Include type if present
  if (output.type) {
    optimized.type = output.type;
  }

  // Only include isSignal if true
  if (output.isSignal === true) {
    optimized.isSignal = true;
  }

  // Include alias if present
  if (output.alias) {
    optimized.alias = output.alias;
  }

  return optimized;
}

/**
 * Optimize entity by removing empty defaults and optimizing nested structures
 */
export function optimizeEntity(entity: any): any {
  const optimized = { ...entity };

  // Optimize inputs (only if non-empty)
  if (optimized.inputs && Array.isArray(optimized.inputs) && optimized.inputs.length > 0) {
    optimized.inputs = optimized.inputs.map(optimizeInputMetadata);
  }

  // Optimize outputs (only if non-empty)
  if (optimized.outputs && Array.isArray(optimized.outputs) && optimized.outputs.length > 0) {
    optimized.outputs = optimized.outputs.map(optimizeOutputMetadata);
  }

  // Remove empty defaults
  return removeEmptyDefaults(optimized);
}
