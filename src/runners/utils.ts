
import { glog } from '../core/Logger';

// --- Utility: Interpolate Variables ---

// Helper to safely evaluate JS expressions within the workflow context
const safeEval = (code: string, context: any, node?: any) => {
  try {
    const $P = context.inputs?.['$P'] || context.inputs || {};
    const $global = context.global || {};
    const $inputs = context.inputs || {};
    const $node = (nodeName: string) => {
      const res = context.executionState?.nodeResults?.[nodeName];
      return res ? { ...res.output, ...res } : {};
    };
    const $WORKFLOW = context.workflow || {};
    const $NODE = node || {};

    const funcBody = `
            try {
                return (${code});
            } catch(e) {
                throw e;
            }
        `;

    const func = new Function('$P', '$global', '$inputs', '$node', '$WORKFLOW', '$NODE', funcBody);
    return func($P, $global, $inputs, $node, $WORKFLOW, $NODE);

  } catch (e: any) {
    // Log error to help debug workflow configuration errors
    glog.error(`[Interpolation Error] Failed to evaluate expression: "${code}"`, e.message);
    return undefined;
  }
};

export const interpolate = (template: any, context: any, node?: any): any => {
  if (typeof template === 'string') {
    const raw = template.trim();

    if (raw.startsWith('=')) {
      let expr = raw.slice(1).trim();
      if (expr.startsWith('{{') && expr.endsWith('}}')) {
        expr = expr.slice(2, -2).trim();
      }
      const result = safeEval(expr, context, node);
      return result !== undefined ? result : raw;
    }

    if (raw.includes('{{')) {
      return raw.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expression) => {
        const result = safeEval(expression, context, node);
        if (typeof result === 'object' && result !== null) {
          return JSON.stringify(result);
        }
        return result !== undefined ? String(result) : "";
      });
    }

    return template;
  } else if (Array.isArray(template)) {
    return template.map(item => interpolate(item, context, node));
  } else if (typeof template === 'object' && template !== null) {
    const result: any = {};
    for (const key in template) {
      result[key] = interpolate(template[key], context, node);
    }
    return result;
  }
  return template;
};

export const evaluateCondition = (condition: any, context: any, node?: any): boolean => {
  if (condition === undefined || condition === null || condition === '') return true;
  if (condition === 'true' || condition === true) return true;
  if (condition === 'false' || condition === false) return false;

  let expr = String(condition).trim();
  if (expr.startsWith('=')) expr = expr.slice(1).trim();
  if (expr.startsWith('{{') && expr.endsWith('}}')) expr = expr.slice(2, -2).trim();

  const result = safeEval(expr, context, node);
  return !!result;
};

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
    } catch (e) { }
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

/**
 * Detect the current execution environment
 * 
 * @returns 'browser' | 'server'
 */
export function detectEnvironment(): 'browser' | 'server' {
  // Check for Node.js specific globals
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'server';
  }

  // Check for browser specific globals
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Default to browser for unknown environments (Web Workers, etc.)
  return 'browser';
}
