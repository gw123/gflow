import { WorkflowDefinition, NodeExecutionResult } from '../types';

export interface WorkflowSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  content: WorkflowDefinition;
  updatedAt: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedWorkflows {
  data: WorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface QueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionHistoryItem {
  id: string;
  workflow_id: string;
  status: 'success' | 'error' | 'running';
  trigger_type: string;
  trigger_by?: string;
  created_at: string;
  finished_at?: string;
  duration_ms?: number;
  logs?: string[];
  output_data?: any;
  error_message?: string;
}

export interface PaginatedExecutions {
  data: ExecutionHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  user_id: number;
  username: string;
  email?: string;
  mobile?: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  username: string;
  role?: Array<{ id: number; name: string; label: string }>;
}

export interface UserInfoResponse {
  user_id: number;
  username: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
}

export interface ServerExecutionResponse {
  results: Record<string, NodeExecutionResult>;
  logs: string[];
  executionId?: string;
  status?: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  params: { key: string; value: string; enabled: boolean }[];
  body: string;
  updatedAt?: string;
}

export interface Plugin {
  id: number;
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
  user_id: number;
}

export interface CreatePluginRequest {
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
}

export interface UpdatePluginRequest {
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
}

export interface PaginatedPlugins {
  data: Plugin[];
  pagination: {
    total_count: number;
    has_more: boolean;
    last_id: number;
    page_size: number;
    page_num: number;
  };
}

export interface ApiResponse<T> {
  code: string;
  code_en: string;
  message?: string;
  data?: T;
  pagination?: any;
}

export interface ServerSecret {
  id: number | string;
  user_id?: number;
  name: string;
  project_name?: string;
  kind?: string;
  type: string;
  provider?: string;
  desc?: string;
  value: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SecretTemplate {
  name: string;
  type: string;
  value: Record<string, any>;
  validation?: Record<string, string>;
}

// WebhookRoute types
export interface WebhookRoute {
  id: number;
  path: string;
  method: string;
  backend: string;
  workflow_name: string;
  timeout: number;
  max_retry: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookRouteRequest {
  path: string;
  method: string;
  backend: string;
  workflow_name: string;
  timeout?: number;
  max_retry?: number;
}

export interface UpdateWebhookRouteRequest {
  path?: string;
  method?: string;
  backend?: string;
  workflow_name?: string;
  timeout?: number;
  max_retry?: number;
}

export interface WebhookRouteListParams {
  keyword?: string;
  page_num?: number;
  page_size?: number;
}

export interface PaginatedWebhookRoutes {
  list: WebhookRoute[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WebhookRouteApiListResponse {
  code: string;
  code_en: string;
  pagination: {
    total_count: number;
    has_more: boolean;
    last_id: number;
  };
  data: WebhookRoute[];
}

// Node Template types
export interface NodeTemplate {
  name: string;
  type: string;
  credentialType?: string;
  credentials?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface NodeTemplateCategory {
  type: string;
  description: string;
  templates: NodeTemplate[];
}

export interface NodeTemplatesResponse {
  code: string;
  code_en: string;
  message: string;
  data: Record<string, NodeTemplateCategory>;
}
