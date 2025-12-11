
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

/**
 * Response context for synchronous trigger responses
 */
export interface ResponseContext {
  /** Response body data */
  body?: any;
  /** HTTP status code (default: 200) */
  statusCode?: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Whether a response has been set */
  hasResponse: boolean;
  /** Event ID for correlation */
  eventId?: string;
}

export interface WorkflowExecutionState {
  isRunning: boolean;
  isPaused?: boolean;
  waitingForInput?: boolean;
  pendingInputConfig?: PendingInputConfig;
  nodeResults: Record<string, NodeExecutionResult>;
  logs: string[];
  /** Response context for synchronous trigger responses */
  responseContext?: ResponseContext;
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

/**
 * Options for workflow execution with synchronous response support
 */
export interface WorkflowExecutionOptions {
  /** Response callback for synchronous responses */
  responseCallback?: (response: ResponseContext) => void;
  /** Event ID for correlation */
  eventId?: string;
  /** Response timeout in milliseconds */
  responseTimeout?: number;
}
