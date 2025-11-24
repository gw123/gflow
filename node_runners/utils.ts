
// --- Utility: Interpolate Variables ---
export const interpolate = (template: any, context: any): any => {
  if (typeof template === 'string') {
    if (template.startsWith('=') || template.includes('{{')) {
      try {
        // Strip initial "=" if present for consistent behavior
        let expr = template.startsWith('=') ? template.slice(1) : template;
        
        // Handle double curly braces {{ var }} replacement
        expr = expr.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, variable) => {
            // This is a very basic evaluation. 
            // In a real engine, use a safe parser.
            // Here we support $P (parameters/inputs), $global (global state)
            
            const keys = variable.split('.');
            let value = context;
            
            // Map shortcuts
            if (keys[0] === '$P') {
                value = context.inputs || {};
                keys.shift();
            } else if (keys[0] === '$global') {
                value = context.global || {};
                keys.shift();
            } else if (context.executionState?.nodeResults?.[keys[0]]?.output) {
                // Access previous node output via node name: $NodeName.field
                value = context.executionState.nodeResults[keys[0]].output;
                keys.shift();
            } else if (context.inputs && context.inputs[keys[0]]) {
                 // Direct access to flattened inputs
                 value = context.inputs[keys[0]];
                 keys.shift();
            }

            for (const key of keys) {
                if (value && typeof value === 'object') {
                    value = value[key];
                } else {
                    return undefined; // Return undefined for replacement logic handling
                }
            }
            return value !== undefined ? value : "";
        });

        // If the result is a pure JavaScript expression (after substitution), evaluate it
        // This is dangerous in prod, but standard for these low-code prototypes
        if (!template.includes('{{')) {
             // It was just a direct expression like "=1+1"
             // eslint-disable-next-line no-new-func
             return new Function('return ' + expr)();
        }
        
        return expr;
      } catch (e) {
        return template; // Fallback
      }
    }
    return template;
  } else if (Array.isArray(template)) {
    return template.map(item => interpolate(item, context));
  } else if (typeof template === 'object' && template !== null) {
    const result: any = {};
    for (const key in template) {
      result[key] = interpolate(template[key], context);
    }
    return result;
  }
  return template;
};

export const evaluateCondition = (condition: string, context: any): boolean => {
    if (!condition) return true;
    
    // If condition is a simple string "true", return true
    if (condition === 'true') return true;
    
    // Interpolate first to resolve variables
    // If the condition string is like "={{ $P.val > 10 }}", interpolate removes {{}} and sub values
    let expression = condition;
    
    // Handle standard interpolation if wrapped
    if (condition.startsWith('=') || condition.includes('{{')) {
        const val = interpolate(condition, context);
        // If interpolation returns a boolean directly
        if (typeof val === 'boolean') return val;
        expression = String(val);
    }

    try {
        // Evaluate the resulting string as JS
        // eslint-disable-next-line no-new-func
        return !!new Function('return ' + expression)();
    } catch (e) {
        console.error("Condition evaluation failed", e);
        return false;
    }
};

// --- Schema Validation ---

export interface Schema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: Schema | boolean;
  enum?: any[];
  pattern?: string;
}

export const validateSchema = (data: any, schema: Schema, path: string = ''): string[] => {
  const errors: string[] = [];

  if (data === undefined || data === null) {
    if (schema.required) {
      errors.push(`${path || 'root'} is required.`);
    }
    return errors;
  }

  if (schema.type !== 'any') {
    const type = typeof data;
    if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        errors.push(`${path || 'root'} expected array, got ${type}`);
      }
    } else if (schema.type === 'object') {
      if (type !== 'object' || Array.isArray(data)) {
        errors.push(`${path || 'root'} expected object, got ${Array.isArray(data) ? 'array' : type}`);
      }
    } else {
      if (type !== schema.type) {
        errors.push(`${path || 'root'} expected ${schema.type}, got ${type}`);
      }
    }
  }

  if (errors.length > 0) return errors;

  if (schema.pattern && typeof data === 'string') {
    try {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push(`${path || 'root'} format invalid`);
      }
    } catch(e) {}
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path || 'root'} invalid value. Expected one of: ${schema.enum.join(', ')}`);
  }

  if (schema.type === 'object' && !Array.isArray(data)) {
    if (schema.properties) {
      for (const key in schema.properties) {
        const fieldErrors = validateSchema(data[key], schema.properties[key], path ? `${path}.${key}` : key);
        errors.push(...fieldErrors);
      }
    }
    if (schema.additionalProperties !== undefined) {
       const definedKeys = new Set(Object.keys(schema.properties || {}));
       for (const key in data) {
         if (!definedKeys.has(key)) {
            if (schema.additionalProperties === false) {
                 errors.push(`${path ? `${path}.` : ''}${key} is not allowed`);
            } else if (typeof schema.additionalProperties === 'object') {
                 const fieldErrors = validateSchema(data[key], schema.additionalProperties as Schema, path ? `${path}.${key}` : key);
                 errors.push(...fieldErrors);
            }
         }
       }
    }
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, index) => {
          const itemErrors = validateSchema(item, schema.items!, `${path}[${index}]`);
          errors.push(...itemErrors);
      });
  }

  return errors;
};
