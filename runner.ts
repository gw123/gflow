
import { 
  WorkflowDefinition, 
  NodeRunnerContext, 
  WorkflowExecutionState
} from './types';
import { getRunner, evaluateCondition } from './node_runners';

// --- Workflow Runner ---

export class WorkflowRunner {
  private workflow: WorkflowDefinition;
  private updateCallback: (state: WorkflowExecutionState) => void;
  private state: WorkflowExecutionState;

  constructor(workflow: WorkflowDefinition, onUpdate: (state: WorkflowExecutionState) => void) {
    this.workflow = workflow;
    this.updateCallback = onUpdate;
    this.state = {
      isRunning: false,
      nodeResults: {},
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

  public async execute() {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.state.nodeResults = {};
    this.state.logs = [];
    this.log("Starting workflow execution...");
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
            
            // If we see the same node again in the queue, that's okay (multiple parents), 
            // but if we already processed it successfully, we usually skip unless it's a loop.
            // For simple DAG, skip.
            if (processed.has(currentName)) continue;

            const nodeDef = this.workflow.nodes.find(n => n.name === currentName);
            if (!nodeDef) {
                this.log(`Error: Node ${currentName} not found definition`);
                continue;
            }

            // 2. Execute Node
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
                // Combine outputs from previous nodes as inputs
                inputs: nodeInputs 
            };

            try {
                const result = await runner.run(nodeDef, context);
                
                this.state.nodeResults[currentName] = {
                    ...this.state.nodeResults[currentName],
                    status: result.status || 'success',
                    endTime: Date.now(),
                    inputs: result.inputs,
                    output: result.output,
                    logs: result.logs || [],
                    error: result.error
                };
                
                if (result.status === 'success') {
                    // Store output for downstream
                    nodeInputs[currentName] = result.output;
                    // Also allow accessing via $node.Name.output pattern implicitly by flattening
                    nodeInputs['$P'] = { ...nodeInputs['$P'], ...result.output }; 
                }

            } catch (e: any) {
                this.state.nodeResults[currentName].status = 'error';
                this.state.nodeResults[currentName].error = e.message;
                this.state.nodeResults[currentName].endTime = Date.now();
                this.log(`Node ${currentName} failed: ${e.message}`);
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
                                        inputs: nodeInputs
                                    };
                                    
                                    const passed = evaluateCondition(condition, context);
                                    if (!passed) {
                                        shouldRun = false;
                                        this.log(`Skipping edge ${currentName} -> ${rule.node}: Condition '${condition}' failed.`);
                                        break;
                                    } else {
                                        this.log(`Edge ${currentName} -> ${rule.node}: Condition '${condition}' passed.`);
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
        this.notify();
    }
  }
}
