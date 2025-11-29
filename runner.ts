

import { 
  WorkflowDefinition, 
  NodeRunnerContext, 
  WorkflowExecutionState,
  PendingInputConfig,
  NodeExecutionResult
} from './types';
import { getRunner, evaluateCondition } from './node_runners';

// --- Workflow Runner ---

export class WorkflowRunner {
  private workflow: WorkflowDefinition;
  private updateCallback: (state: WorkflowExecutionState) => void;
  public state: WorkflowExecutionState;
  private mode: 'run' | 'step' = 'run';
  private stepResolver: (() => void) | null = null;
  private inputResolver: ((data: any) => void) | null = null;

  constructor(
    workflow: WorkflowDefinition, 
    onUpdate: (state: WorkflowExecutionState) => void,
    initialResults?: Record<string, NodeExecutionResult>
  ) {
    this.workflow = workflow;
    this.updateCallback = onUpdate;
    this.state = {
      isRunning: false,
      isPaused: false,
      waitingForInput: false,
      nodeResults: initialResults || {},
      logs: []
    };
  }

  private log(message: string) {
    this.state.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    this.notify();
  }

  private notify() {
    this.updateCallback({ ...this.state });
  }

  public async execute(mode: 'run' | 'step' = 'run') {
    if (this.state.isRunning) return;
    
    this.mode = mode;
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.waitingForInput = false;
    this.state.pendingInputConfig = undefined;
    this.state.nodeResults = {};
    this.state.logs = [];
    this.log(`Starting workflow execution in ${mode} mode...`);
    this.notify();

    try {
        // 1. Identify Start Nodes (Manual, Webhook, Timer)
        const startNodes = this.workflow.nodes.filter(n => n.type === 'manual' || n.type === 'webhook' || n.type === 'timer');
        
        if (startNodes.length === 0) {
            this.log("No trigger nodes found (Manual, Webhook, Timer). Starting with first node.");
            if (this.workflow.nodes.length > 0) {
                startNodes.push(this.workflow.nodes[0]);
            } else {
                throw new Error("Empty workflow");
            }
        }

        // Queue for BFS traversal
        const queue: string[] = startNodes.map(n => n.name);
        const processed = new Set<string>();
        const nodeInputs: Record<string, any> = {}; // Accumulate outputs for next inputs

        while (queue.length > 0) {
            const currentName = queue.shift()!;
            
            if (processed.has(currentName)) continue;

            // --- Pause for Step Mode ---
            if (this.mode === 'step') {
                 this.log(`[Step Mode] Paused before executing: ${currentName}`);
                 this.state.isPaused = true;
                 this.notify();
                 
                 // Wait for nextStep() or resume() to be called
                 await new Promise<void>(resolve => { this.stepResolver = resolve; });
                 
                 this.state.isPaused = false;
                 this.stepResolver = null;
                 this.notify();
            }

            const nodeDef = this.workflow.nodes.find(n => n.name === currentName);
            if (!nodeDef) {
                this.log(`Error: Node ${currentName} not found definition`);
                continue;
            }

            // 2. Execute Node
            this.log(`-> Starting Node: ${currentName} (${nodeDef.type})`);
            
            this.state.nodeResults[currentName] = {
                nodeName: currentName,
                status: 'running',
                startTime: Date.now(),
                logs: []
            };
            this.notify();

            const runner = getRunner(nodeDef.type);
            const context: NodeRunnerContext = {
                workflow: this.workflow,
                executionState: this.state,
                global: this.workflow.global || {},
                inputs: nodeInputs,
                // Pass wait handler
                waitForInput: (config) => this.waitForInput(config),
                // Pass log handler for real-time node logging
                log: (msg: string) => {
                    if (this.state.nodeResults[currentName]) {
                        this.state.nodeResults[currentName].logs.push(msg);
                        this.notify();
                    }
                }
            };

            try {
                const result = await runner.run(nodeDef, context);
                
                this.state.nodeResults[currentName] = {
                    ...this.state.nodeResults[currentName],
                    status: result.status || 'success',
                    endTime: Date.now(),
                    inputs: result.inputs,
                    output: result.output,
                    logs: result.logs || this.state.nodeResults[currentName].logs, // Use existing logs if provided
                    error: result.error
                };
                
                if (result.status === 'success') {
                    // Store output for downstream
                    nodeInputs[currentName] = result.output;
                    // Also allow accessing via $node.Name.output pattern implicitly by flattening
                    nodeInputs['$P'] = { ...nodeInputs['$P'], ...result.output }; 
                    this.log(`   Node ${currentName} completed successfully.`);
                } else {
                    this.log(`   Node ${currentName} failed/skipped.`);
                }

            } catch (e: any) {
                this.state.nodeResults[currentName].status = 'error';
                this.state.nodeResults[currentName].error = e.message;
                this.state.nodeResults[currentName].endTime = Date.now();
                this.log(`Node ${currentName} failed exception: ${e.message}`);
            }
            
            this.notify();

            // 3. Find Next Nodes with Condition Evaluation
            if (this.state.nodeResults[currentName].status === 'success') {
                const connections = this.workflow.connections?.[currentName];
                if (connections) {
                    for (const group of connections) {
                        for (const rule of group) {
                            if (processed.has(rule.node)) continue;
                            
                            // Evaluate 'when' conditions
                            let shouldRun = true;
                            if (rule.when && Array.isArray(rule.when) && rule.when.length > 0) {
                                // We treat multiple conditions as AND
                                for (const condition of rule.when) {
                                    const context: NodeRunnerContext = {
                                        workflow: this.workflow,
                                        executionState: this.state,
                                        global: this.workflow.global || {},
                                        inputs: nodeInputs,
                                        log: () => {} // No-op for condition eval
                                    };
                                    
                                    const passed = evaluateCondition(condition, context);
                                    if (!passed) {
                                        shouldRun = false;
                                        this.log(`   Edge ${currentName} -> ${rule.node}: Condition '${condition}' FAILED.`);
                                        break;
                                    } else {
                                        this.log(`   Edge ${currentName} -> ${rule.node}: Condition '${condition}' PASSED.`);
                                    }
                                }
                            }

                            if (shouldRun) {
                                if (!queue.includes(rule.node)) {
                                    queue.push(rule.node);
                                }
                            }
                        }
                    }
                }
            }
            
            processed.add(currentName);
        }

        this.log("Workflow execution completed.");
    } catch (e: any) {
        this.log(`Workflow execution failed: ${e.message}`);
    } finally {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.waitingForInput = false;
        this.state.pendingInputConfig = undefined;
        this.notify();
    }
  }

  public async executeNode(nodeName: string) {
    const nodeDef = this.workflow.nodes.find(n => n.name === nodeName);
    if (!nodeDef) {
        this.log(`Error: Node ${nodeName} not found`);
        return;
    }

    // Initialize/Reset result for this node
    this.log(`[Single Run] Executing node: ${nodeName}`);
    this.state.nodeResults[nodeName] = {
        nodeName: nodeName,
        status: 'running',
        startTime: Date.now(),
        logs: []
    };
    this.notify();

    // Gather inputs from current state
    const nodeInputs: Record<string, any> = { '$P': {} };
    Object.values(this.state.nodeResults).forEach(res => {
        if (res.status === 'success' && res.output) {
             nodeInputs[res.nodeName] = res.output;
             nodeInputs['$P'] = { ...nodeInputs['$P'], ...res.output };
        }
    });

    const runner = getRunner(nodeDef.type);
    const context: NodeRunnerContext = {
        workflow: this.workflow,
        executionState: this.state,
        global: this.workflow.global || {},
        inputs: nodeInputs,
        waitForInput: (config) => this.waitForInput(config),
        log: (msg) => {
             if (this.state.nodeResults[nodeName]) {
                 this.state.nodeResults[nodeName].logs.push(msg);
                 this.notify();
             }
        }
    };

    try {
        const result = await runner.run(nodeDef, context);
        this.state.nodeResults[nodeName] = {
            ...this.state.nodeResults[nodeName],
            status: result.status || 'success',
            endTime: Date.now(),
            inputs: result.inputs,
            output: result.output,
            logs: result.logs || this.state.nodeResults[nodeName].logs,
            error: result.error
        };
        this.log(`[Single Run] Node ${nodeName} finished with status: ${result.status || 'success'}`);
    } catch (e: any) {
        this.state.nodeResults[nodeName] = {
            ...this.state.nodeResults[nodeName],
            status: 'error',
            error: e.message,
            endTime: Date.now()
        };
        this.log(`[Single Run] Node ${nodeName} failed: ${e.message}`);
    }
    this.notify();
  }

  public nextStep() {
      if (this.stepResolver) {
          this.stepResolver();
      }
  }

  public resume() {
      this.mode = 'run';
      if (this.stepResolver) {
          this.stepResolver();
      }
  }

  // Called by Interaction Node
  public waitForInput(config: PendingInputConfig): Promise<any> {
      this.log(`Waiting for user input on node: ${config.nodeName}`);
      
      this.state.waitingForInput = true;
      this.state.pendingInputConfig = config;
      // We are technically 'running' but blocked on IO
      this.notify();

      return new Promise((resolve) => {
          this.inputResolver = resolve;
      });
  }

  // Called by UI
  public submitInput(data: any) {
      if (this.inputResolver) {
          this.log(`Input received for ${this.state.pendingInputConfig?.nodeName}`);
          
          this.state.waitingForInput = false;
          this.state.pendingInputConfig = undefined;
          this.notify();
          
          this.inputResolver(data);
          this.inputResolver = null;
      }
  }
}
