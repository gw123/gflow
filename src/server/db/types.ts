/**
 * Database Types - 数据库实体类型定义
 */

// ==================== 租户 & 用户 ====================

export interface Tenant {
  id: string;
  name: string;
  slug: string;           // 唯一标识符 (URL友好)
  plan: 'free' | 'pro' | 'enterprise';
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar_url?: string;
  settings?: Record<string, any>;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ==================== 工作流 ====================

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  content: Record<string, any>;  // WorkflowDefinition JSON
  version: number;
  status: 'draft' | 'active' | 'archived';
  is_template: boolean;
  created_by: string;            // User ID
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  trigger_type: 'manual' | 'schedule' | 'webhook' | 'api';
  trigger_by?: string;           // User ID or system
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  node_results?: Record<string, any>;
  logs?: string[];
  error_message?: string;
  started_at?: Date;
  finished_at?: Date;
  duration_ms?: number;
  created_at: Date;
}

// ==================== 密钥 & API ====================

export interface Secret {
  id: string;
  tenant_id: string;
  name: string;
  type: string;                  // 'api_key' | 'oauth' | 'database' | 'custom'
  data_encrypted: string;        // 加密存储的凭证数据
  description?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiEndpoint {
  id: string;
  tenant_id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, any>;
  body_template?: Record<string, any>;
  auth_type?: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
  secret_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ==================== Agent ====================

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  model: string;                 // 'gpt-4' | 'claude-3' | etc
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  settings?: Record<string, any>;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AgentTool {
  id: string;
  agent_id: string;
  tenant_id: string;
  name: string;
  type: 'builtin' | 'custom' | 'workflow';
  description?: string;
  config: Record<string, any>;   // 工具配置
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AgentMcp {
  id: string;
  agent_id: string;
  tenant_id: string;
  name: string;
  server_command: string;
  server_args?: string[];
  env_vars?: Record<string, string>;
  auto_approve?: string[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// ==================== 存储 & 文件 ====================

export interface StorageEngine {
  id: string;
  tenant_id: string;
  name: string;
  type: 's3' | 'local' | 'gcs' | 'azure' | 'minio';
  config_encrypted: string;      // 加密的配置信息
  is_default: boolean;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface File {
  id: string;
  tenant_id: string;
  storage_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;                  // 存储路径
  url?: string;                  // 访问URL
  metadata?: Record<string, any>;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

// ==================== 标签 & 表单 ====================

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color?: string;
  entity_type: 'workflow' | 'agent' | 'file' | 'form';
  created_at: Date;
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_id: string;
  entity_type: string;
  created_at: Date;
}

export interface Form {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  schema: Record<string, any>;   // JSON Schema 定义
  ui_schema?: Record<string, any>;
  default_values?: Record<string, any>;
  settings?: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  tenant_id: string;
  data: Record<string, any>;
  submitted_by?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}
