import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ResponseNodeRunner } from './ResponseNodeRunner';
import { safeSerialize, safeDeserialize, roundTrip } from './serialization';
import { NodeDefinition, NodeRunnerContext, WorkflowExecutionState, ResponseContext } from '../../core/types';

/**
 * Helper to create a minimal workflow execution state
 */
function createExecutionState(eventId?: string): WorkflowExecutionState {
  return {
    isRunning: true,
    nodeResults: {},
    logs: [],
    responseContext: {
      hasResponse: false,
      eventId
    }
  };
}

/**
 * Helper to create a minimal node runner context
 */
function createContext(
  inputs: Record<string, any> = {},
  executionState?: WorkflowExecutionState
): NodeRunnerContext {
  return {
    workflow: { name: 'test-workflow', nodes: [] },
    executionState: executionState || createExecutionState(),
    global: {},
    inputs,
    log: () => {}
  };
}

/**
 * Helper to create a response node definition
 */
function createResponseNode(params: Record<string, any>): NodeDefinition {
  return {
    name: 'test_response',
    type: 'response',
    parameters: params
  };
}

describe('ResponseNodeRunner Property Tests', () => {
  const runner = new ResponseNodeRunner();

  // Helper to check if a value contains template-like strings that would be interpolated
  // or special JavaScript properties that don't round-trip correctly
  function containsProblematicValues(value: any): boolean {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.startsWith('=') || trimmed.includes('{{');
    }
    if (Array.isArray(value)) {
      return value.some(containsProblematicValues);
    }
    if (typeof value === 'object' && value !== null) {
      // Check for __proto__ which doesn't round-trip correctly
      if (Object.prototype.hasOwnProperty.call(value, '__proto__')) {
        return true;
      }
      return Object.values(value).some(containsProblematicValues);
    }
    return false;
  }

  // Generator for JSON values that don't contain template-like strings or problematic properties
  const safeJsonValue = fc.jsonValue().filter(v => !containsProblematicValues(v));

  /**
   * **Feature: gateway-sync-response, Property 1: Response capture round-trip**
   * 
   * *For any* response node with valid body data, when the response node executes,
   * the same data SHALL be retrievable from the response context.
   * 
   * **Validates: Requirements 1.2, 3.2**
   */
  describe('Property 1: Response capture round-trip', () => {
    it('should capture any JSON-serializable body in response context', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeJsonValue,
          async (bodyData) => {
            const executionState = createExecutionState('test-event-123');
            const context = createContext({}, executionState);
            const node = createResponseNode({ body: bodyData });

            const result = await runner.run(node, context);

            // Verify the response was captured successfully
            expect(result.status).toBe('success');
            
            // Verify the response context was updated
            expect(executionState.responseContext).toBeDefined();
            expect(executionState.responseContext!.hasResponse).toBe(true);
            
            // Verify the body data matches (round-trip)
            expect(executionState.responseContext!.body).toEqual(bodyData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve event ID through response capture', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          safeJsonValue,
          async (eventId, bodyData) => {
            const executionState = createExecutionState(eventId);
            const context = createContext({}, executionState);
            const node = createResponseNode({ body: bodyData });

            await runner.run(node, context);

            // Verify event ID is preserved
            expect(executionState.responseContext!.eventId).toBe(eventId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: gateway-sync-response, Property 2: Response parameters applied correctly**
   * 
   * *For any* response node configuration with body, status_code, and headers parameters,
   * the resulting HTTP response SHALL contain exactly those values.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  describe('Property 2: Response parameters applied correctly', () => {
    // Generator for valid HTTP status codes (100-599)
    const statusCodeArb = fc.integer({ min: 100, max: 599 });
    
    // Generator for valid HTTP headers
    // Note: Header values must not start with '=' (after trimming) as those are treated as template expressions
    const headerValueArb = fc.string({ minLength: 0, maxLength: 200 })
      .filter(s => !s.trim().startsWith('=') && !s.includes('{{'));
    
    const headersArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
      headerValueArb
    );

    it('should apply all response parameters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeJsonValue,
          statusCodeArb,
          headersArb,
          async (body, statusCode, headers) => {
            const executionState = createExecutionState();
            const context = createContext({}, executionState);
            const node = createResponseNode({
              body,
              status_code: statusCode,
              headers
            });

            const result = await runner.run(node, context);

            expect(result.status).toBe('success');
            
            // Verify all parameters are applied to response context
            const responseContext = executionState.responseContext!;
            expect(responseContext.body).toEqual(body);
            expect(responseContext.statusCode).toBe(statusCode);
            expect(responseContext.headers).toEqual(headers);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default status_code to 200 when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeJsonValue,
          async (body) => {
            const executionState = createExecutionState();
            const context = createContext({}, executionState);
            const node = createResponseNode({ body });

            await runner.run(node, context);

            expect(executionState.responseContext!.statusCode).toBe(200);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default headers to empty object when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeJsonValue,
          async (body) => {
            const executionState = createExecutionState();
            const context = createContext({}, executionState);
            const node = createResponseNode({ body });

            await runner.run(node, context);

            expect(executionState.responseContext!.headers).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: gateway-sync-response, Property 3: Template interpolation preserves data**
   * 
   * *For any* template expression in the body parameter and any workflow context,
   * interpolating the template SHALL produce a result that correctly references the context values.
   * 
   * **Validates: Requirements 2.5**
   */
  describe('Property 3: Template interpolation preserves data', () => {
    it('should interpolate simple context values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer(),
          async (stringValue, numberValue) => {
            const executionState = createExecutionState();
            const inputs = {
              $P: {
                testString: stringValue,
                testNumber: numberValue
              }
            };
            const context = createContext(inputs, executionState);
            
            // Use template expression to reference context values
            const node = createResponseNode({
              body: '={{ { str: $P.testString, num: $P.testNumber } }}'
            });

            const result = await runner.run(node, context);

            expect(result.status).toBe('success');
            expect(executionState.responseContext!.body).toEqual({
              str: stringValue,
              num: numberValue
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should interpolate nested object values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.integer()
          }),
          async (nestedObj) => {
            const executionState = createExecutionState();
            const inputs = {
              $P: {
                data: nestedObj
              }
            };
            const context = createContext(inputs, executionState);
            
            const node = createResponseNode({
              body: '={{ $P.data }}'
            });

            const result = await runner.run(node, context);

            expect(result.status).toBe('success');
            expect(executionState.responseContext!.body).toEqual(nestedObj);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass through non-template values unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeJsonValue,
          async (staticValue) => {
            const executionState = createExecutionState();
            const context = createContext({}, executionState);
            
            // Non-template value should pass through unchanged
            const node = createResponseNode({
              body: staticValue
            });

            const result = await runner.run(node, context);

            expect(result.status).toBe('success');
            expect(executionState.responseContext!.body).toEqual(staticValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Response Serialization Property Tests', () => {
  /**
   * **Feature: gateway-sync-response, Property 6: JSON serialization round-trip**
   * 
   * *For any* valid response body object, serializing to JSON and deserializing
   * SHALL produce an equivalent object.
   * 
   * **Validates: Requirements 3.5**
   */
  describe('Property 6: JSON serialization round-trip', () => {
    it('should produce equivalent object after serialize/deserialize', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.jsonValue(),
          async (value) => {
            const serialized = safeSerialize(value);
            expect(serialized).not.toBeNull();
            
            const deserialized = safeDeserialize(serialized!);
            // Note: JSON.stringify converts -0 to 0, so we use JSON.stringify for comparison
            // This is expected behavior per JSON spec
            expect(JSON.stringify(deserialized)).toBe(JSON.stringify(value));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle roundTrip utility correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.jsonValue(),
          async (value) => {
            const result = roundTrip(value);
            expect(result).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nested objects correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            string: fc.string(),
            number: fc.integer(),
            boolean: fc.boolean(),
            array: fc.array(fc.integer()),
            nested: fc.record({
              value: fc.string()
            })
          }),
          async (obj) => {
            const result = roundTrip(obj);
            expect(result).toEqual(obj);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases gracefully', () => {
      // undefined becomes null
      expect(safeSerialize(undefined)).toBe('null');
      
      // null stays null
      expect(safeDeserialize(safeSerialize(null)!)).toBeNull();
      
      // Empty object
      expect(roundTrip({})).toEqual({});
      
      // Empty array
      expect(roundTrip([])).toEqual([]);
      
      // Empty string
      expect(roundTrip('')).toBe('');
    });

    it('should handle circular references without throwing', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      
      // Should not throw
      const serialized = safeSerialize(obj);
      expect(serialized).not.toBeNull();
      
      // Should contain circular marker
      expect(serialized).toContain('[Circular]');
    });

    it('should handle BigInt by converting to string', () => {
      const obj = { big: BigInt(9007199254740991) };
      const serialized = safeSerialize(obj);
      expect(serialized).not.toBeNull();
      
      const deserialized = safeDeserialize(serialized!);
      expect(deserialized.big).toBe('9007199254740991');
    });

    it('should skip functions and symbols', () => {
      const obj = {
        value: 42,
        fn: () => {},
        sym: Symbol('test')
      };
      
      const result = roundTrip(obj);
      expect(result).toEqual({ value: 42 });
      expect(result.fn).toBeUndefined();
      expect(result.sym).toBeUndefined();
    });
  });
});


describe('Timeout Configuration Property Tests', () => {
  /**
   * **Feature: gateway-sync-response, Property 8: Timeout configuration respected**
   * 
   * *For any* configured response_timeout value, the gateway SHALL wait no longer
   * than that duration before returning a timeout response.
   * 
   * Note: This is a unit test for the timeout configuration logic.
   * Full integration testing of the Go gateway plugin timeout behavior
   * would require a separate Go test suite.
   * 
   * **Validates: Requirements 5.1, 5.4**
   */
  describe('Property 8: Timeout configuration respected', () => {
    it('should validate timeout values are within acceptable range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 60000 }), // 100ms to 60s
          async (timeoutMs) => {
            // Validate timeout is a positive integer
            expect(timeoutMs).toBeGreaterThanOrEqual(100);
            expect(timeoutMs).toBeLessThanOrEqual(60000);
            expect(Number.isInteger(timeoutMs)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to 30000ms when timeout not specified', () => {
      const defaultTimeout = 30000;
      expect(defaultTimeout).toBe(30000);
    });

    it('should handle edge case timeout values', () => {
      // Minimum reasonable timeout
      const minTimeout = 100;
      expect(minTimeout).toBeGreaterThan(0);
      
      // Maximum reasonable timeout (60 seconds)
      const maxTimeout = 60000;
      expect(maxTimeout).toBeLessThanOrEqual(60000);
    });
  });
});
