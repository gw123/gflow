
import { 
    WorkflowDefinition, 
    WorkflowExecutionState, 
    NodeExecutionResult, 
    NodeRunnerContext,
    NodeRunner,
    NodeDefinition
} from './types';

export interface EngineCallbacks {
    onUpdate: (state: WorkflowExecutionState) => void;
    getRunner: (type: string) => NodeRunner;
    evaluateCondition: (condition: any, context: NodeRunnerContext) => boolean;
}

/**
 * Universal Workflow Engine
 * Handles Graph Traversal (BFS), State Management, and Control Flow.
 * Platform-agnostic.
 */
export class WorkflowEngine {
    private workflow: WorkflowDefinition;
    private callbacks: EngineCallbacks;
    public state: WorkflowExecutionState;
    
    // Control Flags
    private mode: 'run' | 'step' = 'run';
    private stepResolver: (() => void) | null = null;
    private inputResolver: ((data: any) => void) | null = null;

    constructor(
        workflow: WorkflowDefinition, 
        callbacks: EngineCallbacks,
        initialState?: Partial<WorkflowExecutionState>
    ) {
        this.workflow = workflow;
        this.callbacks = callbacks;
        this.state = {
            isRunning: false,
            isPaused: false,
            waitingForInput: false,
            nodeResults: {},
            logs: [],
            ...initialState
        };
    }

    private log(message: string) {
        this.state.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
        this.notify();
    }

    private notify() {
        this.callbacks.onUpdate({ ...this.state });
    }

    public async execute(mode: 'run' | 'step' = 'run') {
        if (this.state.isRunning && !this.state.isPaused) return;
        
        this.mode = mode;
        this.state.isRunning = true;
        
        // Reset if starting fresh
        if (!this.state.isPaused && !this.state.waitingForInput) {
            this.state.nodeResults = {};
            this.state.logs = [];
            this.log(`Starting execution in ${mode} mode...`);
        } else {
            this.log(`Resuming execution...`);
        }
        
        this.state.isPaused = false;
        this.state.waitingForInput = false;
        this.notify();

        try {
            // 1. Identify Start Nodes (or Resume Point)
            const startNodes = this.workflow.nodes.filter(n => ['manual', 'webhook', 'timer'].includes(n.type));
            const queue: string[] = startNodes.map(n => n.name);
            
            if (queue.length === 0 && this.workflow.nodes.length > 0) {
                queue.push(this.workflow.nodes[0].name);
            }

            const processed = new Set<string>();
            
            // Gather inputs from previous results
            const nodeInputs: Record<string, any> = { '$P': {} };
            Object.values(this.state.nodeResults).forEach(res => {
                if (res.status === 'success' && res.output) {
                    nodeInputs[res.nodeName] = res.output;
                    nodeInputs['$P'] = { ...nodeInputs['$P'], ...res.output };
                }
            });

            while (queue.length > 0) {
                // Yield to Event Loop to allow UI updates (Vital for Main Thread execution)
                await new Promise(resolve => setTimeout(resolve, 0));

                // Check termination signal
                if (!this.state.isRunning) {
                    this.log("Execution stopped by user.");
                    break;
                }

                const currentName = queue.shift()!;
                
                const existingResult = this.state.nodeResults[currentName];
                const alreadyDone = existingResult?.status === 'success';

                if (processed.has(currentName)) continue;

                // --- Pause for Step Mode ---
                if (this.mode === 'step' && !alreadyDone) {
                     this.state.isPaused = true;
                     this.log(`[Step] Paused at: ${currentName}`);
                     this.notify();
                     await new Promise<void>(resolve => { this.stepResolver = resolve; });
                     this.state.isPaused = false;
                     this.notify();
                }

                const nodeDef = this.workflow.nodes.find(n => n.name === currentName);
                if (!nodeDef) continue;

                // 2. Execute Node (if not done)
                if (!alreadyDone) {
                    this.state.nodeResults[currentName] = {
                        nodeName: currentName,
                        status: 'running',
                        startTime: Date.now(),
                        logs: []
                    };
                    this.notify();

                    const runner = this.callbacks.getRunner(nodeDef.type);
                    const context: NodeRunnerContext = {
                        workflow: this.workflow,
                        executionState: this.state,
                        global: this.workflow.global || {},
                        inputs: nodeInputs,
                        waitForInput: (config) => this.waitForInput(config),
                        log: (msg: string) => {
                            if (this.state.nodeResults[currentName]) {
                                this.state.nodeResults[currentName].logs.push(msg);
                                this.notify();
                            }
                        }
                    };

                    try {
                        const result = await runner.run(nodeDef, context);
                        
                        // Update State
                        this.state.nodeResults[currentName] = {
                            ...this.state.nodeResults[currentName],
                            status: result.status || 'success',
                            endTime: Date.now(),
                            inputs: result.inputs,
                            output: result.output,
                            logs: result.logs || this.state.nodeResults[currentName].logs,
                            error: result.error
                        };

                        if (this.state.nodeResults[currentName].status === 'success') {
                            nodeInputs[currentName] = result.output;
                            nodeInputs['$P'] = { ...nodeInputs['$P'], ...result.output };
                        }

                    } catch (e: any) {
                        this.state.nodeResults[currentName].status = 'error';
                        this.state.nodeResults[currentName].error = e.message;
                        this.state.nodeResults[currentName].endTime = Date.now();
                        this.log(`Node ${currentName} Error: ${e.message}`);
                    }
                    this.notify();
                }

                // 3. Process Edges (Traversal)
                if (this.state.nodeResults[currentName]?.status === 'success') {
                    const connections = this.workflow.connections?.[currentName];
                    if (connections) {
                        for (const group of connections) {
                            for (const rule of group) {
                                if (processed.has(rule.node)) continue;
                                
                                // Evaluate Condition
                                let shouldRun = true;
                                if (rule.when && rule.when.length > 0) {
                                    for (const condition of rule.when) {
                                        const context: NodeRunnerContext = {
                                            workflow: this.workflow,
                                            executionState: this.state,
                                            global: this.workflow.global || {},
                                            inputs: nodeInputs,
                                            log: () => {},
                                            waitForInput: undefined
                                        };
                                        if (!this.callbacks.evaluateCondition(condition, context)) {
                                            shouldRun = false;
                                            break;
                                        }
                                    }
                                }

                                if (shouldRun && !queue.includes(rule.node)) {
                                    queue.push(rule.node);
                                }
                            }
                        }
                    }
                }
                
                processed.add(currentName);
            }

            if (this.state.isRunning) {
                this.log("Workflow execution finished.");
            }

        } catch (e: any) {
            this.log(`Critical Engine Error: ${e.message}`);
        } finally {
            // Only stop if we are not waiting for input
            if (!this.state.waitingForInput) {
                this.state.isRunning = false;
                this.state.isPaused = false;
                this.notify();
            }
        }
    }

    public waitForInput(config: any): Promise<any> {
        this.state.waitingForInput = true;
        this.state.pendingInputConfig = config;
        this.notify();
        return new Promise((resolve) => {
            this.inputResolver = resolve;
        });
    }

    public submitInput(data: any) {
        if (this.inputResolver) {
            this.state.waitingForInput = false;
            this.state.pendingInputConfig = undefined;
            this.notify();
            this.inputResolver(data);
            this.inputResolver = null;
        }
    }

    public nextStep() {
        if (this.stepResolver) this.stepResolver();
    }

    public resume() {
        this.mode = 'run';
        if (this.stepResolver) this.stepResolver();
    }

    public terminate() {
        this.state.isRunning = false;
        if (this.stepResolver) this.stepResolver(); // Unblock loop so it can see isRunning=false
    }
}
