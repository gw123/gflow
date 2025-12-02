
// --- Shared Data Structures (No React Dependencies) ---

export interface NodeParameter {
  [key: string]: any;
}

export interface NodeCredentials {
  [key: string]: any;
}

export interface NodeDefinition {
  name: string;
  type: string;
  desc?: string;
  parameters?: NodeParameter;
  credentials?: NodeCredentials;
  credential_id?: string;
  global?: Record<string, any>;
  id?: string; // Optional internal ID
  [key: string]: any;
}

export interface ConnectionRule {
  node: string;
  when?: any[];
}

export interface WorkflowConnections {
  [sourceNode: string]: Array<Array<ConnectionRule>>;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  nodes: NodeDefinition[];
  global?: Record<string, any>;
  connections?: WorkflowConnections;
}

export interface PendingInputConfig {
  nodeName: string;
  title: string;
  description?: string;
  fields: any[]; // Keeping generic to avoid UI types dependency
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface NodeExecutionResult {
  nodeName: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  inputs?: any;
  output?: any;
  error?: string;
  logs: string[];
}

export interface WorkflowExecutionState {
  isRunning: boolean;
  isPaused?: boolean;
  waitingForInput?: boolean;
  pendingInputConfig?: PendingInputConfig;
  nodeResults: Record<string, NodeExecutionResult>;
  logs: string[];
}

export interface NodeRunnerContext {
  workflow: WorkflowDefinition;
  executionState: WorkflowExecutionState;
  global: Record<string, any>;
  inputs: Record<string, any>;
  // Callbacks used by nodes
  log: (message: string) => void;
  waitForInput?: (config: PendingInputConfig) => Promise<any>;
}

export interface NodeRunner {
  run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>>;
}
