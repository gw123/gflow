
import { ComponentType } from 'react';

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

export interface ToolDefinition {
  name: string;
  description: string;
  type: string;
  content: string;
  parameters?: string;
}

export interface NodeParameter {
  [key: string]: any;
}

export interface NodeCredentials {
  [key: string]: any;
}

export interface PluginParameterDefinition {
  name: string;
  type: 'string' | 'int' | 'integer' | 'float' | 'double' | 'number' | 'bool' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
  required?: boolean;
  options?: string[]; // For select inputs
}

export interface PluginMetadata {
  kind: string;
  nodeType: string;
  credentialType?: string;
  parameters?: PluginParameterDefinition[];
  // 节点分类：用于识别触发节点（例如 'trigger'）
  category?: string;
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
  
  // Metadata for dynamic plugins (gRPC)
  meta?: PluginMetadata;
  
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
  tools?: ToolDefinition[];
  nodes: NodeDefinition[];
  global?: Record<string, any>;
  connections?: WorkflowConnections;
  pinData?: Record<string, any>;
}

// --- Interaction Types ---

export interface InputFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text' | 'password' | 'email' | 'date';
  defaultValue?: any;
  options?: string[];
  required?: boolean;
  description?: string;
  placeholder?: string;
  
  // Validation
  validationRegex?: string;
  validationMessage?: string;
  
  // Styling
  className?: string; // Tailwind classes
  style?: Record<string, any>; // Inline styles for the input
}

export interface PendingInputConfig {
  nodeName: string;
  title: string;
  description?: string;
  fields: InputFieldDefinition[];
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
  inputs: Record<string, any>; // Inputs from previous nodes
  waitForInput?: (config: PendingInputConfig) => Promise<any>;
  log: (message: string) => void; // Real-time logging
}

export interface NodeRunner {
  run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>>;
}

// --- Registry Types (New) ---

export interface NodeVisuals {
  icon: string; // Changed from ComponentType to string to be Worker-safe
  color: string;
  bg: string;
  border: string;
}

export interface NodePlugin {
  type: string;
  category: string; // 'trigger' | 'action' | 'ai' | 'control' | 'system' | 'data' | 'human' | 'plugin'
  template: NodeDefinition;
  runner: NodeRunner;
  visuals: NodeVisuals;
}
