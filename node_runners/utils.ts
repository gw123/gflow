

// --- Utility: Interpolate Variables ---

// Helper to safely evaluate JS expressions within the workflow context
const safeEval = (code: string, context: any) => {
    try {
        // 1. Prepare Scope Variables
        
        // $P: The flattened parameters/inputs available to the node (Accumulated from previous nodes)
        const $P = context.inputs?.['$P'] || context.inputs || {};
        
        // $global: Global workflow configuration variables
        const $global = context.global || {};
        
        // $inputs: The raw inputs object (contains specific node outputs + $P)
        const $inputs = context.inputs || {};
        
        // $node: Helper to access specific node output by name
        // e.g. $node("MyWebhook").body
        const $node = (nodeName: string) => {
             const res = context.executionState?.nodeResults?.[nodeName];
             // Return output mixed with metadata or empty object if not found
             return res ? { ...res.output, ...res } : {}; 
        };

        // 2. Create Execution Function
        // We wrap the code in a return statement, but also handle potential multiline code blocks if needed
        // For expressions, we typically expect a return value.
        const funcBody = `
            try {
                return (${code});
            } catch(e) {
                // Return undefined on error to allow the flow to continue (or handle explicitly)
                return undefined;
            }
        `;

        const func = new Function('$P', '$global', '$inputs', '$node', funcBody);
        
        // 3. Execute
        return func($P, $global, $inputs, $node);

    } catch (e) {
        // console.error(`Eval setup error for expression "${code}":`, e);
        return undefined;
    }
};

export const interpolate = (template: any, context: any): any => {
  if (typeof template === 'string') {
    const raw = template.trim();

    // Case 1: n8n-style expression starting with '='
    // e.g. "={{ $P.value + 1 }}" or "= $P.value + 1"
    if (raw.startsWith('=')) {
        let expr = raw.slice(1).trim();
        
        // Remove outer curly braces if present (common in UI editors)
        // e.g. ={{ $P.val }} becomes $P.val
        // We match {{ content }} but account for potential whitespace
        if (expr.startsWith('{{') && expr.endsWith('}}')) {
            expr = expr.slice(2, -2).trim();
        }
        
        const result = safeEval(expr, context);
        // If evaluation fails (undefined), return original raw string to indicate failure/literal, 
        // OR return undefined. Returning raw helps debugging sometimes. 
        // For logic gates, we might want boolean.
        return result !== undefined ? result : raw;
    }

    // Case 2: String interpolation with embedded {{ }}
    // e.g. "Hello {{ $P.name }}"
    if (raw.includes('{{')) {
      return raw.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expression) => {
        const result = safeEval(expression, context);
        // If result is an object/array, stringify it
        if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result);
        }
        return result !== undefined ? String(result) : "";
      });
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

export const evaluateCondition = (condition: any, context: any): boolean => {
    if (condition === undefined || condition === null || condition === '') return true; // Default to true if empty? Or false? Usually empty condition means pass.
    
    // Check for literal booleans
    if (condition === 'true' || condition === true) return true;
    if (condition === 'false' || condition === false) return false;
    
    // Normalize condition string (remove = and {{ }}) to ensure it is treated as an expression
    let expr = String(condition).trim();
    
    // Ensure it's treated as an expression even if it doesn't start with =
    if (expr.startsWith('=')) expr = expr.slice(1).trim();
    if (expr.startsWith('{{') && expr.endsWith('}}')) expr = expr.slice(2, -2).trim();
    
    const result = safeEval(expr, context);
    
    // Strict boolean check or truthy check
    return !!result;
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