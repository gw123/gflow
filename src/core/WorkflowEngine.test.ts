import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { WorkflowEngine } from './WorkflowEngine';
import { 
  WorkflowDefinition, 
  NodeRunner, 
  NodeDefinition, 
  NodeRunnerContext, 
  NodeExecutionResult,
  ResponseContext 
} from './types';

/**
 * Helper to create a minimal workflow definition
 */
function createWorkflow(nodes: NodeDefinition[], connections?: Record<string, any>): WorkflowDefinition {
  return {
    name: 'test-workflow',
    nodes,
    connections
  };
}

/**
 * Helper to create a mock runner that succeeds
 */
function createSuccessRunner(output?: any): NodeRunner {
  return {
    run: async () => ({
      status: 'success' as const,
      output: output ?? {},
      logs: []
    })
  };
}

/**
 * Helper to create a response node runner that writes to response context
 */
function createResponseRunner(responseData: Partial<ResponseContext>): NodeRunner {
  return {
    run: async (node: NodeDefinition, context: NodeRunnerContext) => {
      if (context.executionState) {
        context.executionState.responseContext = {
          body: responseData.body,
          statusCode: responseData.statusCode ?? 200,
          headers: responseData.headers ?? {},
          hasResponse: true,
          eventId: context.executionState.responseContext?.eventId
        };
      }
      return {
        status: 'success' as const,
        output: { captured: true },
        logs: []
      };
    }
  };
}

/**
 * Create engine callbacks with custom runner logic
 */
function createCallbacks(getRunnerFn: (type: string) => NodeRunner) {
  return {
    onUpdate: vi.fn(),
    getRunner: getRunnerFn,
    evaluateCondition: () => true
  };
}

describe('WorkflowEngine Response Context Property Tests', () => {

  /**
   * **Feature: gateway-sync-response, Property 4: Response context initialization**
   * 
   * *For any* workflow execution, the workflow engine SHALL create a response context
   * with hasResponse=false before executing any nodes.
   * 
   * **Validates: Requirements 3.1**
   */
  describe('Property 4: Response context initialization', () => {
    it('should initialize response context with hasResponse=false on workflow start', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          async (workflowName, nodeNames) => {
            // Create unique node names
            const uniqueNames = [...new Set(nodeNames)];
            if (uniqueNames.length === 0) return;

            const nodes: NodeDefinition[] = uniqueNames.map((name, i) => ({
              name,
              type: i === 0 ? 'manual' : 'js',
              meta: i === 0 ? { category: 'trigger' } : undefined
            }));

            const workflow = createWorkflow(nodes);
            let capturedState: any = null;

            const callbacks = {
              onUpdate: vi.fn((state) => {
                // Capture state on first update (after initialization)
                if (!capturedState && state.isRunning) {
                  capturedState = { ...state };
                }
              }),
              getRunner: () => createSuccessRunner(),
              evaluateCondition: () => true
            };

            const engine = new WorkflowEngine(workflow, callbacks);
            await engine.execute('run');

            // Verify response context was initialized
            expect(engine.state.responseContext).toBeDefined();
            expect(engine.state.responseContext!.hasResponse).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should attach eventId to response context when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (eventId) => {
            const nodes: NodeDefinition[] = [
              { name: 'start', type: 'manual', meta: { category: 'trigger' } }
            ];

            const workflow = createWorkflow(nodes);
            const callbacks = createCallbacks(() => createSuccessRunner());

            const engine = new WorkflowEngine(workflow, callbacks);
            await engine.execute('run', { eventId });

            // Verify eventId is attached
            expect(engine.state.responseContext).toBeDefined();
            expect(engine.state.responseContext!.eventId).toBe(eventId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have undefined eventId when not provided', async () => {
      const nodes: NodeDefinition[] = [
        { name: 'start', type: 'manual', meta: { category: 'trigger' } }
      ];

      const workflow = createWorkflow(nodes);
      const callbacks = createCallbacks(() => createSuccessRunner());

      const engine = new WorkflowEngine(workflow, callbacks);
      await engine.execute('run');

      expect(engine.state.responseContext).toBeDefined();
      expect(engine.state.responseContext!.eventId).toBeUndefined();
    });
  });


  /**
   * **Feature: gateway-sync-response, Property 5: Last response wins**
   * 
   * *For any* workflow with multiple response nodes, the response context SHALL
   * contain the output from the last executed response node.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 5: Last response wins', () => {
    it('should contain output from the last executed response node', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              body: fc.jsonValue(),
              statusCode: fc.integer({ min: 100, max: 599 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (responseConfigs) => {
            // Create a workflow with multiple response nodes in sequence
            const nodes: NodeDefinition[] = [
              { name: 'start', type: 'manual', meta: { category: 'trigger' } },
              ...responseConfigs.map((_, i) => ({
                name: `response_${i}`,
                type: 'response'
              }))
            ];

            // Create connections: start -> response_0 -> response_1 -> ...
            const connections: Record<string, any> = {
              start: [[{ node: 'response_0' }]]
            };
            responseConfigs.forEach((_, i) => {
              if (i < responseConfigs.length - 1) {
                connections[`response_${i}`] = [[{ node: `response_${i + 1}` }]];
              }
            });

            const workflow = createWorkflow(nodes, connections);
            
            // Track which response node is being executed
            let responseIndex = 0;
            
            const callbacks = createCallbacks((type) => {
              if (type === 'response') {
                const config = responseConfigs[responseIndex];
                responseIndex++;
                return createResponseRunner({
                  body: config.body,
                  statusCode: config.statusCode
                });
              }
              return createSuccessRunner();
            });

            const engine = new WorkflowEngine(workflow, callbacks);
            await engine.execute('run');

            // Verify the last response wins
            const lastConfig = responseConfigs[responseConfigs.length - 1];
            expect(engine.state.responseContext).toBeDefined();
            expect(engine.state.responseContext!.hasResponse).toBe(true);
            expect(engine.state.responseContext!.body).toEqual(lastConfig.body);
            expect(engine.state.responseContext!.statusCode).toBe(lastConfig.statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should overwrite previous response when new response node executes', async () => {
      const firstResponse = { body: { first: true }, statusCode: 200 };
      const secondResponse = { body: { second: true }, statusCode: 201 };

      const nodes: NodeDefinition[] = [
        { name: 'start', type: 'manual', meta: { category: 'trigger' } },
        { name: 'response_1', type: 'response' },
        { name: 'response_2', type: 'response' }
      ];

      const connections = {
        start: [[{ node: 'response_1' }]],
        response_1: [[{ node: 'response_2' }]]
      };

      const workflow = createWorkflow(nodes, connections);
      
      let callCount = 0;
      const callbacks = createCallbacks((type) => {
        if (type === 'response') {
          callCount++;
          return createResponseRunner(callCount === 1 ? firstResponse : secondResponse);
        }
        return createSuccessRunner();
      });

      const engine = new WorkflowEngine(workflow, callbacks);
      await engine.execute('run');

      // Verify second response overwrote first
      expect(engine.state.responseContext!.body).toEqual(secondResponse.body);
      expect(engine.state.responseContext!.statusCode).toBe(secondResponse.statusCode);
    });
  });

  /**
   * **Feature: gateway-sync-response, Property 7: Response delivery with correlation**
   * 
   * *For any* workflow response delivered to a trigger plugin, the response SHALL
   * include the original event ID that initiated the workflow.
   * 
   * **Validates: Requirements 4.2, 4.3**
   */
  describe('Property 7: Response delivery with correlation', () => {
    it('should preserve event ID in response context after response node execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.jsonValue(),
          async (eventId, responseBody) => {
            const nodes: NodeDefinition[] = [
              { name: 'start', type: 'manual', meta: { category: 'trigger' } },
              { name: 'response', type: 'response' }
            ];

            const connections = {
              start: [[{ node: 'response' }]]
            };

            const workflow = createWorkflow(nodes, connections);
            
            const callbacks = createCallbacks((type) => {
              if (type === 'response') {
                return createResponseRunner({ body: responseBody });
              }
              return createSuccessRunner();
            });

            const engine = new WorkflowEngine(workflow, callbacks);
            await engine.execute('run', { eventId });

            // Verify event ID is preserved in response context
            expect(engine.state.responseContext).toBeDefined();
            expect(engine.state.responseContext!.hasResponse).toBe(true);
            expect(engine.state.responseContext!.eventId).toBe(eventId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include event ID in response context even when no response node executes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (eventId) => {
            const nodes: NodeDefinition[] = [
              { name: 'start', type: 'manual', meta: { category: 'trigger' } },
              { name: 'process', type: 'js' }
            ];

            const connections = {
              start: [[{ node: 'process' }]]
            };

            const workflow = createWorkflow(nodes, connections);
            const callbacks = createCallbacks(() => createSuccessRunner());

            const engine = new WorkflowEngine(workflow, callbacks);
            await engine.execute('run', { eventId });

            // Verify event ID is still in response context (even without response node)
            expect(engine.state.responseContext).toBeDefined();
            expect(engine.state.responseContext!.hasResponse).toBe(false);
            expect(engine.state.responseContext!.eventId).toBe(eventId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
