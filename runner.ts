
import { WorkflowDefinition, WorkflowExecutionState, NodeExecutionResult } from './types';
import { getRunner, evaluateCondition } from './node_runners';
import { WorkflowEngine } from './core/WorkflowEngine';

// --- Frontend Adapter ---

export class WorkflowRunner {
  private engine: WorkflowEngine;

  constructor(
    workflow: WorkflowDefinition, 
    onUpdate: (state: WorkflowExecutionState) => void,
    initialResults?: Record<string, NodeExecutionResult>
  ) {
    this.engine = new WorkflowEngine(
        // Cast local types to core types (they should be compatible)
        workflow as any, 
        {
            onUpdate: (s) => onUpdate(s as WorkflowExecutionState),
            getRunner: (type) => getRunner(type) as any,
            evaluateCondition: (c, ctx) => evaluateCondition(c, ctx)
        },
        { nodeResults: initialResults as any }
    );
  }

  // Proxy properties for the UI
  get state() { return this.engine.state as WorkflowExecutionState; }

  public execute(mode: 'run' | 'step' = 'run') {
      return this.engine.execute(mode);
  }

  public nextStep() {
      this.engine.nextStep();
  }

  public resume() {
      this.engine.resume();
  }

  public submitInput(data: any) {
      this.engine.submitInput(data);
  }

  // Helper for single node execution (Visual test)
  public async executeNode(nodeName: string) {
      // Create a temporary mini-workflow or just leverage the runner logic directly?
      // Since WorkflowEngine is designed for full flows, we can manually trigger the runner
      // This bypasses the engine's queue but uses the same runner infrastructure.
      // This keeps single-node runs simple and visual.
      
      const nodeDef = (this.engine as any).workflow.nodes.find((n: any) => n.name === nodeName);
      if(!nodeDef) return;

      const state = this.engine.state;
      state.nodeResults[nodeName] = {
          nodeName: nodeName,
          status: 'running',
          startTime: Date.now(),
          logs: []
      } as any;
      (this.engine as any).notify();

      const runner = getRunner(nodeDef.type);
      const inputs: any = { '$P': {} };
      // Hydrate inputs from existing state
      Object.values(state.nodeResults).forEach((res: any) => {
          if (res.output) {
              inputs[res.nodeName] = res.output;
              inputs['$P'] = { ...inputs['$P'], ...res.output };
          }
      });

      const ctx = {
          workflow: (this.engine as any).workflow,
          executionState: state,
          global: (this.engine as any).workflow.global || {},
          inputs,
          log: (msg: string) => {
              if (state.nodeResults[nodeName]) {
                  state.nodeResults[nodeName].logs.push(msg);
                  (this.engine as any).notify();
              }
          }
      };

      try {
          const res = await runner.run(nodeDef, ctx as any);
          state.nodeResults[nodeName] = {
              ...state.nodeResults[nodeName],
              status: res.status || 'success',
              endTime: Date.now(),
              inputs: res.inputs,
              output: res.output,
              logs: res.logs || state.nodeResults[nodeName].logs,
              error: res.error
          } as any;
      } catch(e: any) {
          state.nodeResults[nodeName].status = 'error';
          state.nodeResults[nodeName].error = e.message;
      }
      (this.engine as any).notify();
  }
}
