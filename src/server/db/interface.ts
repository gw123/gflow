/**
 * Database Interface - 数据库抽象接口
 * 定义统一的数据库操作接口，支持 SQLite 和 PostgreSQL
 */

import {
  Tenant, User, Workflow, WorkflowExecution,
  Secret, ApiEndpoint, Agent, AgentTool, AgentMcp,
  StorageEngine, File, Tag, EntityTag, Form, FormSubmission
} from './types';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 通用 Repository 接口
 */
export interface Repository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(tenantId: string, options?: QueryOptions): Promise<PaginatedResult<T>>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * 数据库适配器接口
 */
export interface DatabaseAdapter {
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // 事务支持
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  // 原始查询
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: string }>;
  
  // Schema 管理
  migrate(): Promise<void>;
  seed?(): Promise<void>;
}

// ==================== Repository 接口定义 ====================

export interface TenantRepository extends Repository<Tenant, CreateTenantDTO, UpdateTenantDTO> {
  findBySlug(slug: string): Promise<Tenant | null>;
}

export interface UserRepository extends Repository<User, CreateUserDTO, UpdateUserDTO> {
  findByUsername(tenantId: string, username: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;
}

export interface WorkflowRepository extends Repository<Workflow, CreateWorkflowDTO, UpdateWorkflowDTO> {
  findByStatus(tenantId: string, status: Workflow['status'], options?: QueryOptions): Promise<PaginatedResult<Workflow>>;
  findTemplates(options?: QueryOptions): Promise<PaginatedResult<Workflow>>;
  incrementVersion(id: string): Promise<number>;
  search(tenantId: string, query: string, status?: Workflow['status'], options?: QueryOptions): Promise<PaginatedResult<Workflow>>;
}

export interface WorkflowExecutionRepository extends Repository<WorkflowExecution, CreateWorkflowExecutionDTO, UpdateWorkflowExecutionDTO> {
  findByWorkflowId(workflowId: string, options?: QueryOptions): Promise<PaginatedResult<WorkflowExecution>>;
  findByStatus(tenantId: string, status: WorkflowExecution['status'], options?: QueryOptions): Promise<PaginatedResult<WorkflowExecution>>;
  getStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<ExecutionStats>;
}

export interface SecretRepository extends Repository<Secret, CreateSecretDTO, UpdateSecretDTO> {
  findByType(tenantId: string, type: string): Promise<Secret[]>;
}

export interface ApiEndpointRepository extends Repository<ApiEndpoint, CreateApiEndpointDTO, UpdateApiEndpointDTO> {
  findByPath(tenantId: string, method: string, path: string): Promise<ApiEndpoint | null>;
}

export interface AgentRepository extends Repository<Agent, CreateAgentDTO, UpdateAgentDTO> {
  findActive(tenantId: string): Promise<Agent[]>;
}

export interface AgentToolRepository extends Repository<AgentTool, CreateAgentToolDTO, UpdateAgentToolDTO> {
  findByAgentId(agentId: string): Promise<AgentTool[]>;
  toggleEnabled(id: string, enabled: boolean): Promise<void>;
}

export interface AgentMcpRepository extends Repository<AgentMcp, CreateAgentMcpDTO, UpdateAgentMcpDTO> {
  findByAgentId(agentId: string): Promise<AgentMcp[]>;
  toggleEnabled(id: string, enabled: boolean): Promise<void>;
}

export interface StorageEngineRepository extends Repository<StorageEngine, CreateStorageEngineDTO, UpdateStorageEngineDTO> {
  findDefault(tenantId: string): Promise<StorageEngine | null>;
  setDefault(tenantId: string, id: string): Promise<void>;
}

export interface FileRepository extends Repository<File, CreateFileDTO, UpdateFileDTO> {
  findByStorageId(storageId: string, options?: QueryOptions): Promise<PaginatedResult<File>>;
  findByMimeType(tenantId: string, mimeType: string, options?: QueryOptions): Promise<PaginatedResult<File>>;
}

export interface TagRepository extends Repository<Tag, CreateTagDTO, UpdateTagDTO> {
  findByEntityType(tenantId: string, entityType: Tag['entity_type']): Promise<Tag[]>;
}

export interface EntityTagRepository {
  addTag(entityId: string, entityType: string, tagId: string): Promise<EntityTag>;
  removeTag(entityId: string, tagId: string): Promise<boolean>;
  findTagsByEntity(entityId: string, entityType: string): Promise<Tag[]>;
  findEntitiesByTag(tagId: string): Promise<{ entityId: string; entityType: string }[]>;
}

export interface FormRepository extends Repository<Form, CreateFormDTO, UpdateFormDTO> {
  findPublished(tenantId: string): Promise<Form[]>;
}

export interface FormSubmissionRepository extends Repository<FormSubmission, CreateFormSubmissionDTO, never> {
  findByFormId(formId: string, options?: QueryOptions): Promise<PaginatedResult<FormSubmission>>;
}

// ==================== DTO 定义 ====================

export interface CreateTenantDTO {
  name: string;
  slug: string;
  plan?: Tenant['plan'];
  settings?: Record<string, any>;
}

export interface UpdateTenantDTO {
  name?: string;
  plan?: Tenant['plan'];
  settings?: Record<string, any>;
}

export interface CreateUserDTO {
  tenant_id: string;
  username: string;
  email: string;
  password_hash: string;
  role?: User['role'];
  avatar_url?: string;
  settings?: Record<string, any>;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password_hash?: string;
  role?: User['role'];
  avatar_url?: string;
  settings?: Record<string, any>;
}

export interface CreateWorkflowDTO {
  tenant_id: string;
  name: string;
  description?: string;
  content: Record<string, any>;
  is_template?: boolean;
  created_by: string;
}

export interface UpdateWorkflowDTO {
  name?: string;
  description?: string;
  content?: Record<string, any>;
  status?: Workflow['status'];
  is_template?: boolean;
  updated_by?: string;
}

export interface CreateWorkflowExecutionDTO {
  workflow_id: string;
  tenant_id: string;
  trigger_type: WorkflowExecution['trigger_type'];
  trigger_by?: string;
  input_data?: Record<string, any>;
}

export interface UpdateWorkflowExecutionDTO {
  status?: WorkflowExecution['status'];
  output_data?: Record<string, any>;
  node_results?: Record<string, any>;
  logs?: string[];
  error_message?: string;
  started_at?: Date;
  finished_at?: Date;
  duration_ms?: number;
}

export interface CreateSecretDTO {
  tenant_id: string;
  name: string;
  type: string;
  data_encrypted: string;
  description?: string;
  created_by: string;
}

export interface UpdateSecretDTO {
  name?: string;
  type?: string;
  data_encrypted?: string;
  description?: string;
}

export interface CreateApiEndpointDTO {
  tenant_id: string;
  name: string;
  method: ApiEndpoint['method'];
  path: string;
  description?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, any>;
  body_template?: Record<string, any>;
  auth_type?: ApiEndpoint['auth_type'];
  secret_id?: string;
  created_by: string;
}

export interface UpdateApiEndpointDTO {
  name?: string;
  method?: ApiEndpoint['method'];
  path?: string;
  description?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, any>;
  body_template?: Record<string, any>;
  auth_type?: ApiEndpoint['auth_type'];
  secret_id?: string;
}

export interface CreateAgentDTO {
  tenant_id: string;
  name: string;
  description?: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  settings?: Record<string, any>;
  created_by: string;
}

export interface UpdateAgentDTO {
  name?: string;
  description?: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  settings?: Record<string, any>;
  status?: Agent['status'];
}

export interface CreateAgentToolDTO {
  agent_id: string;
  tenant_id: string;
  name: string;
  type: AgentTool['type'];
  description?: string;
  config: Record<string, any>;
  enabled?: boolean;
}

export interface UpdateAgentToolDTO {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  enabled?: boolean;
}

export interface CreateAgentMcpDTO {
  agent_id: string;
  tenant_id: string;
  name: string;
  server_command: string;
  server_args?: string[];
  env_vars?: Record<string, string>;
  auto_approve?: string[];
  enabled?: boolean;
}

export interface UpdateAgentMcpDTO {
  name?: string;
  server_command?: string;
  server_args?: string[];
  env_vars?: Record<string, string>;
  auto_approve?: string[];
  enabled?: boolean;
}

export interface CreateStorageEngineDTO {
  tenant_id: string;
  name: string;
  type: StorageEngine['type'];
  config_encrypted: string;
  is_default?: boolean;
  created_by: string;
}

export interface UpdateStorageEngineDTO {
  name?: string;
  config_encrypted?: string;
  is_default?: boolean;
  status?: StorageEngine['status'];
}

export interface CreateFileDTO {
  tenant_id: string;
  storage_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url?: string;
  metadata?: Record<string, any>;
  uploaded_by: string;
}

export interface UpdateFileDTO {
  name?: string;
  metadata?: Record<string, any>;
}

export interface CreateTagDTO {
  tenant_id: string;
  name: string;
  color?: string;
  entity_type: Tag['entity_type'];
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
}

export interface CreateFormDTO {
  tenant_id: string;
  name: string;
  description?: string;
  schema: Record<string, any>;
  ui_schema?: Record<string, any>;
  default_values?: Record<string, any>;
  settings?: Record<string, any>;
  created_by: string;
}

export interface UpdateFormDTO {
  name?: string;
  description?: string;
  schema?: Record<string, any>;
  ui_schema?: Record<string, any>;
  default_values?: Record<string, any>;
  settings?: Record<string, any>;
  status?: Form['status'];
}

export interface CreateFormSubmissionDTO {
  form_id: string;
  tenant_id: string;
  data: Record<string, any>;
  submitted_by?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  pending: number;
  running: number;
  avgDurationMs: number;
}
