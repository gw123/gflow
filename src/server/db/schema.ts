/**
 * Database Schema - SQL 建表语句
 * 支持 SQLite 和 PostgreSQL 的差异化处理
 */

export type DatabaseType = 'sqlite' | 'postgres';

/**
 * 获取建表 SQL
 */
export function getCreateTableSQL(dbType: DatabaseType): string[] {
  const autoId = dbType === 'postgres' 
    ? 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()' 
    : 'id TEXT PRIMARY KEY';
  
  const timestamp = dbType === 'postgres' ? 'TIMESTAMP' : 'DATETIME';
  const now = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
  const jsonType = dbType === 'postgres' ? 'JSONB' : 'TEXT';
  const textArray = dbType === 'postgres' ? 'TEXT[]' : 'TEXT'; // SQLite 用 JSON 字符串

  return [
    // ==================== 租户表 ====================
    `CREATE TABLE IF NOT EXISTS tenants (
      ${autoId},
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      plan VARCHAR(20) DEFAULT 'free',
      settings ${jsonType},
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 用户表 ====================
    `CREATE TABLE IF NOT EXISTS users (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'viewer',
      avatar_url TEXT,
      settings ${jsonType},
      last_login_at ${timestamp},
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now},
      UNIQUE(tenant_id, username),
      UNIQUE(tenant_id, email)
    )`,

    // ==================== 工作流表 ====================
    `CREATE TABLE IF NOT EXISTS workflows (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      content ${jsonType} NOT NULL,
      version INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'draft',
      is_template BOOLEAN DEFAULT FALSE,
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      updated_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 工作流执行记录表 ====================
    `CREATE TABLE IF NOT EXISTS workflow_executions (
      ${autoId},
      workflow_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      trigger_type VARCHAR(20) NOT NULL,
      trigger_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'},
      status VARCHAR(20) DEFAULT 'pending',
      input_data ${jsonType},
      output_data ${jsonType},
      node_results ${jsonType},
      logs ${jsonType},
      error_message TEXT,
      started_at ${timestamp},
      finished_at ${timestamp},
      duration_ms INTEGER,
      created_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 密钥表 ====================
    `CREATE TABLE IF NOT EXISTS secrets (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      data_encrypted TEXT NOT NULL,
      description TEXT,
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now},
      UNIQUE(tenant_id, name)
    )`,

    // ==================== API 接口表 ====================
    `CREATE TABLE IF NOT EXISTS api_endpoints (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      method VARCHAR(10) NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      headers ${jsonType},
      query_params ${jsonType},
      body_template ${jsonType},
      auth_type VARCHAR(20) DEFAULT 'none',
      secret_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES secrets(id) ON DELETE SET NULL,
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== Agent 表 ====================
    `CREATE TABLE IF NOT EXISTS agents (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      model VARCHAR(100) NOT NULL,
      system_prompt TEXT,
      temperature REAL,
      max_tokens INTEGER,
      settings ${jsonType},
      status VARCHAR(20) DEFAULT 'active',
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== Agent Tools 表 ====================
    `CREATE TABLE IF NOT EXISTS agent_tools (
      ${autoId},
      agent_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL,
      description TEXT,
      config ${jsonType} NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== Agent MCP 表 ====================
    `CREATE TABLE IF NOT EXISTS agent_mcps (
      ${autoId},
      agent_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      server_command TEXT NOT NULL,
      server_args ${jsonType},
      env_vars ${jsonType},
      auto_approve ${jsonType},
      enabled BOOLEAN DEFAULT TRUE,
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 存储引擎表 ====================
    `CREATE TABLE IF NOT EXISTS storage_engines (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL,
      config_encrypted TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'active',
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 文件表 ====================
    `CREATE TABLE IF NOT EXISTS files (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      storage_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES storage_engines(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size BIGINT NOT NULL,
      path TEXT NOT NULL,
      url TEXT,
      metadata ${jsonType},
      uploaded_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 标签表 ====================
    `CREATE TABLE IF NOT EXISTS tags (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20),
      entity_type VARCHAR(20) NOT NULL,
      created_at ${timestamp} DEFAULT ${now},
      UNIQUE(tenant_id, name, entity_type)
    )`,

    // ==================== 实体标签关联表 ====================
    `CREATE TABLE IF NOT EXISTS entity_tags (
      ${autoId},
      tag_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      entity_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL,
      entity_type VARCHAR(20) NOT NULL,
      created_at ${timestamp} DEFAULT ${now},
      UNIQUE(tag_id, entity_id)
    )`,

    // ==================== 表单表 ====================
    `CREATE TABLE IF NOT EXISTS forms (
      ${autoId},
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      schema ${jsonType} NOT NULL,
      ui_schema ${jsonType},
      default_values ${jsonType},
      settings ${jsonType},
      status VARCHAR(20) DEFAULT 'draft',
      created_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      created_at ${timestamp} DEFAULT ${now},
      updated_at ${timestamp} DEFAULT ${now}
    )`,

    // ==================== 表单提交记录表 ====================
    `CREATE TABLE IF NOT EXISTS form_submissions (
      ${autoId},
      form_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      tenant_id ${dbType === 'postgres' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      data ${jsonType} NOT NULL,
      submitted_by ${dbType === 'postgres' ? 'UUID' : 'TEXT'} REFERENCES users(id),
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at ${timestamp} DEFAULT ${now}
    )`
  ];
}

/**
 * 获取索引 SQL
 */
export function getCreateIndexSQL(dbType: DatabaseType): string[] {
  return [
    // 用户索引
    'CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email)',
    
    // 工作流索引
    'CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(tenant_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_workflows_template ON workflows(is_template) WHERE is_template = TRUE',
    
    // 执行记录索引
    'CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id)',
    'CREATE INDEX IF NOT EXISTS idx_executions_tenant ON workflow_executions(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(tenant_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_executions_created ON workflow_executions(created_at)',
    
    // 密钥索引
    'CREATE INDEX IF NOT EXISTS idx_secrets_tenant ON secrets(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_secrets_type ON secrets(tenant_id, type)',
    
    // API 索引
    'CREATE INDEX IF NOT EXISTS idx_apis_tenant ON api_endpoints(tenant_id)',
    
    // Agent 索引
    'CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id)',
    'CREATE INDEX IF NOT EXISTS idx_agent_mcps_agent ON agent_mcps(agent_id)',
    
    // 存储和文件索引
    'CREATE INDEX IF NOT EXISTS idx_storage_tenant ON storage_engines(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_files_tenant ON files(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_files_storage ON files(storage_id)',
    
    // 标签索引
    'CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_id, entity_type)',
    
    // 表单索引
    'CREATE INDEX IF NOT EXISTS idx_forms_tenant ON forms(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id)'
  ];
}
