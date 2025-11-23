
export interface StorageConfig {
  name: string;
  type: string;
  bucket?: string;
  region?: string;
  access_key_id?: string;
  secret_access_key?: string;
  endpoint?: string;
  path_style?: boolean;
  [key: string]: any;
}

export interface CodeSnippet {
  name: string;
  code: string;
}

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
  credential_id?: string; // Linkage to a global credential
  global?: Record<string, any>;
  artifact?: any;
  init_delay?: number;
  secret?: {
    secret_id: string;
    secret_name: string;
    secret_type: string;
    [key: string]: any;
  };
  credentialType?: string;
  [key: string]: any; // Allow extra fields
}

// The specific connection format from the YAML: NodeName: [[{ node: Target, when: ... }]]
export interface ConnectionRule {
  node: string;
  when?: any[];
}

export interface WorkflowConnections {
  [sourceNode: string]: Array<Array<ConnectionRule>>;
}

export interface CredentialItem {
  id: string;
  name: string; // User defined name for this instance (e.g. "Production DB")
  type: string; // The definition name (e.g. 'mysql', 'openai')
  data: Record<string, any>;
}

export interface WorkflowDefinition {
  name: string;
  storages?: StorageConfig[];
  codes?: CodeSnippet[];
  credentials?: CredentialItem[];
  nodes: NodeDefinition[];
  global?: Record<string, any>;
  connections?: WorkflowConnections;
  pinData?: Record<string, any>;
}

// --- Execution Types ---

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface NodeExecutionResult {
  nodeName: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  inputs?: any; // The interpolated parameters/inputs used
  output?: any;
  error?: string;
  logs: string[];
}

export interface WorkflowExecutionState {
  isRunning: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  logs: string[];
}

export interface NodeRunnerContext {
  workflow: WorkflowDefinition;
  executionState: WorkflowExecutionState;
  global: Record<string, any>;
  inputs: Record<string, any>; // Inputs from previous nodes
}

export interface NodeRunner {
  run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>>;
}
