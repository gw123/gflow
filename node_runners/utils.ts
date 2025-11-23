
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
