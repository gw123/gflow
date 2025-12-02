
import { WorkflowDefinition, WorkflowExecutionState, NodeExecutionResult, NodeDefinition } from './types';
import { WorkflowEngine } from './core/WorkflowEngine';
import { Registry } from './registry';
import { evaluateCondition } from './runners/utils';
import './builtins'; // Ensure main thread has registry for UI runners

export class WorkflowRunner {
  private engine: WorkflowEngine;
  public state: WorkflowExecutionState;
  private onUpdateCallback: (state: WorkflowExecutionState) => void;

  constructor(
    workflow: WorkflowDefinition, 
    onUpdate: (state: WorkflowExecutionState) => void,
    initialResults?: Record<string, NodeExecutionResult>
  ) {
    this.onUpdateCallback = onUpdate;
    
    // Initial State
    this.state = {
        isRunning: false,
        isPaused: false,
        waitingForInput: false,
        nodeResults: initialResults || {},
        logs: []
    };

    // Instantiate Engine directly on Main Thread
    this.engine = new WorkflowEngine(
        workflow,
        {
            onUpdate: (newState) => {
                this.state = newState;
                this.onUpdateCallback(newState);
            },
            getRunner: (type) => Registry.getRunner(type),
            evaluateCondition: (condition, context) => evaluateCondition(condition, context)
        },
        this.state
    );
  }

  public async execute(mode: 'run' | 'step' = 'run') {
      // Async execution without blocking main thread (engine handles yielding)
      try {
          await this.engine.execute(mode);
      } catch (e) {
          console.error("Workflow Execution Failed", e);
      }
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

  public terminate() {
      this.engine.terminate();
  }

  public async executeNode(nodeName: string) {
      const node = this.engine['workflow'].nodes.find(n => n.name === nodeName);
      if (!node) return;

      // Single node execution for debugging
      const runner = Registry.getRunner(node.type);
      
      // Construct a mock context
      // Note: This won't have full upstream inputs unless workflow ran previously
      // We try to grab what we can from current state
      const inputs: Record<string, any> = { '$P': {} };
      Object.values(this.state.nodeResults).forEach(res => {
          if (res.status === 'success' && res.output) {
              inputs[res.nodeName] = res.output;
              inputs['$P'] = { ...inputs['$P'], ...res.output };
          }
      });

      const context = {
          workflow: this.engine['workflow'],
          executionState: this.state,
          global: this.engine['workflow'].global || {},
          inputs: inputs,
          waitForInput: undefined, // Single node usually doesn't wait
          log: (m: string) => console.log(`[SingleRun] ${m}`)
      };

      try {
          const result = await runner.run(node, context);
          console.log("Node Result:", result);
          // Optionally update UI with this result?
      } catch (e) {
          console.error("Single Node Error:", e);
      }
  }
}
