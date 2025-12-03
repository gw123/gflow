/**
 * Database Module - 数据库模块入口
 * 
 * 使用示例:
 * 
 * ```typescript
 * import { createDatabase, DatabaseConfig } from './db';
 * 
 * // SQLite (开发环境)
 * const db = await createDatabase({ type: 'sqlite', filename: './data/app.db' });
 * 
 * // PostgreSQL (生产环境)
 * const db = await createDatabase({ 
 *   type: 'postgres', 
 *   host: 'localhost',
 *   database: 'workflow',
 *   user: 'postgres',
 *   password: 'secret'
 * });
 * 
 * // 使用 Repository
 * const user = await db.users.findById('user-id');
 * const workflows = await db.workflows.findAll('tenant-id');
 * ```
 */

import { SQLiteAdapter, SQLiteConfig, PostgresAdapter, PostgresConfig, BaseDatabaseAdapter } from './adapters';
import {
  TenantRepository,
  UserRepository,
  WorkflowRepository,
  WorkflowExecutionRepository,
  SecretRepository,
  ApiEndpointRepository,
  AgentRepository,
  AgentToolRepository,
  AgentMcpRepository,
  StorageEngineRepository,
  FileRepository,
  TagRepository,
  EntityTagRepository,
  FormRepository,
  FormSubmissionRepository
} from './repositories';

// ==================== 配置类型 ====================

export interface SQLiteDatabaseConfig extends SQLiteConfig {
  type: 'sqlite';
}

export interface PostgresDatabaseConfig extends PostgresConfig {
  type: 'postgres';
}

export type DatabaseConfig = SQLiteDatabaseConfig | PostgresDatabaseConfig;

// ==================== Database 类 ====================

export class Database {
  private adapter: BaseDatabaseAdapter;
  
  // Repositories
  public tenants: TenantRepository;
  public users: UserRepository;
  public workflows: WorkflowRepository;
  public workflowExecutions: WorkflowExecutionRepository;
  public secrets: SecretRepository;
  public apiEndpoints: ApiEndpointRepository;
  public agents: AgentRepository;
  public agentTools: AgentToolRepository;
  public agentMcps: AgentMcpRepository;
  public storageEngines: StorageEngineRepository;
  public files: FileRepository;
  public tags: TagRepository;
  public entityTags: EntityTagRepository;
  public forms: FormRepository;
  public formSubmissions: FormSubmissionRepository;

  constructor(adapter: BaseDatabaseAdapter) {
    this.adapter = adapter;
    
    // 初始化所有 Repository
    this.tenants = new TenantRepository(adapter);
    this.users = new UserRepository(adapter);
    this.workflows = new WorkflowRepository(adapter);
    this.workflowExecutions = new WorkflowExecutionRepository(adapter);
    this.secrets = new SecretRepository(adapter);
    this.apiEndpoints = new ApiEndpointRepository(adapter);
    this.agents = new AgentRepository(adapter);
    this.agentTools = new AgentToolRepository(adapter);
    this.agentMcps = new AgentMcpRepository(adapter);
    this.storageEngines = new StorageEngineRepository(adapter);
    this.files = new FileRepository(adapter);
    this.tags = new TagRepository(adapter);
    this.entityTags = new EntityTagRepository(adapter);
    this.forms = new FormRepository(adapter);
    this.formSubmissions = new FormSubmissionRepository(adapter);
  }

  /**
   * 获取底层适配器 (用于原始查询)
   */
  getAdapter(): BaseDatabaseAdapter {
    return this.adapter;
  }

  /**
   * 执行事务
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.adapter.beginTransaction();
    try {
      const result = await fn();
      await this.adapter.commit();
      return result;
    } catch (err) {
      await this.adapter.rollback();
      throw err;
    }
  }

  /**
   * 执行数据库迁移
   */
  async migrate(): Promise<void> {
    await this.adapter.migrate();
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await this.adapter.disconnect();
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.adapter.isConnected();
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建数据库实例
 */
export async function createDatabase(config: DatabaseConfig): Promise<Database> {
  let adapter: BaseDatabaseAdapter;

  if (config.type === 'sqlite') {
    adapter = new SQLiteAdapter(config);
  } else if (config.type === 'postgres') {
    adapter = new PostgresAdapter(config);
  } else {
    throw new Error(`Unsupported database type: ${(config as any).type}`);
  }

  // 连接数据库
  await adapter.connect();

  return new Database(adapter);
}

/**
 * 从环境变量创建数据库实例
 */
export async function createDatabaseFromEnv(): Promise<Database> {
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'postgres') {
    return createDatabase({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : undefined,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      ssl: process.env.PG_SSL === 'true',
      connectionString: process.env.DATABASE_URL
    });
  }

  return createDatabase({
    type: 'sqlite',
    filename: process.env.SQLITE_FILE || './data/workflow.db'
  });
}

// ==================== 导出 ====================

// 类型导出
export type * from './types';

// 接口导出
export type {
  QueryOptions,
  PaginatedResult,
  Repository,
  DatabaseAdapter,
  ExecutionStats,
  // DTOs
  CreateTenantDTO, UpdateTenantDTO,
  CreateUserDTO, UpdateUserDTO,
  CreateWorkflowDTO, UpdateWorkflowDTO,
  CreateWorkflowExecutionDTO, UpdateWorkflowExecutionDTO,
  CreateSecretDTO, UpdateSecretDTO,
  CreateApiEndpointDTO, UpdateApiEndpointDTO,
  CreateAgentDTO, UpdateAgentDTO,
  CreateAgentToolDTO, UpdateAgentToolDTO,
  CreateAgentMcpDTO, UpdateAgentMcpDTO,
  CreateStorageEngineDTO, UpdateStorageEngineDTO,
  CreateFileDTO, UpdateFileDTO,
  CreateTagDTO, UpdateTagDTO,
  CreateFormDTO, UpdateFormDTO,
  CreateFormSubmissionDTO
} from './interface';

// 适配器导出
export { BaseDatabaseAdapter, SQLiteAdapter, PostgresAdapter } from './adapters';
export type { SQLiteConfig, PostgresConfig } from './adapters';

// Repository 导出
export {
  TenantRepository,
  UserRepository,
  WorkflowRepository,
  WorkflowExecutionRepository,
  SecretRepository,
  ApiEndpointRepository,
  AgentRepository,
  AgentToolRepository,
  AgentMcpRepository,
  StorageEngineRepository,
  FileRepository,
  TagRepository,
  EntityTagRepository,
  FormRepository,
  FormSubmissionRepository
} from './repositories';

// 工具函数导出
export * from './utils';
