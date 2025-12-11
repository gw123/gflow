/**
 * Database Usage Example - 数据库使用示例
 * 
 * 这个文件展示如何在 server 中使用数据库模块
 */

import { createDatabase, createDatabaseFromEnv, Database } from './index';
import { hashPassword, verifyPassword, encryptJson, decryptJson } from './utils';
import { glog } from '../../core/Logger';

// ==================== 初始化数据库 ====================

async function initDatabase(): Promise<Database> {
  // 方式1: 从环境变量创建 (推荐)
  // const db = await createDatabaseFromEnv();

  // 方式2: 显式配置 SQLite
  const db = await createDatabase({
    type: 'sqlite',
    filename: './data/workflow.db'
  });

  // 方式3: 显式配置 PostgreSQL
  // const db = await createDatabase({
  //   type: 'postgres',
  //   host: 'localhost',
  //   port: 5432,
  //   database: 'workflow',
  //   user: 'postgres',
  //   password: 'secret'
  // });

  // 执行数据库迁移
  await db.migrate();

  return db;
}

// ==================== 使用示例 ====================

async function examples(db: Database) {
  // --- 租户管理 ---
  const tenant = await db.tenants.create({
    name: 'Acme Corp',
    slug: 'acme',
    plan: 'pro'
  });
  glog.info('Created tenant:', tenant);

  // --- 用户管理 ---
  const passwordHash = hashPassword('secret123');
  const user = await db.users.create({
    tenant_id: tenant.id,
    username: 'admin',
    email: 'admin@acme.com',
    password_hash: passwordHash,
    role: 'admin'
  });
  glog.info('Created user:', user);

  // 验证密码
  const isValid = verifyPassword('secret123', user.password_hash);
  glog.info('Password valid:', isValid);

  // --- 工作流管理 ---
  const workflow = await db.workflows.create({
    tenant_id: tenant.id,
    name: 'My First Workflow',
    description: 'A simple workflow',
    content: {
      nodes: [
        { name: 'Start', type: 'trigger' },
        { name: 'Process', type: 'js', parameters: { code: 'return input * 2' } }
      ],
      connections: {
        'Start': [[{ node: 'Process' }]]
      }
    },
    created_by: user.id
  });
  glog.info('Created workflow:', workflow);

  // 查询工作流
  const workflows = await db.workflows.findAll(tenant.id, { limit: 10 });
  glog.info('Workflows:', workflows);

  // --- 工作流执行记录 ---
  const execution = await db.workflowExecutions.create({
    workflow_id: workflow.id,
    tenant_id: tenant.id,
    trigger_type: 'manual',
    trigger_by: user.id,
    input_data: { value: 42 }
  });
  glog.info('Created execution:', execution);

  // 更新执行状态
  await db.workflowExecutions.update(execution.id, {
    status: 'success',
    output_data: { result: 84 },
    duration_ms: 150
  });

  // 获取执行统计
  const stats = await db.workflowExecutions.getStats(tenant.id);
  glog.info('Execution stats:', stats);

  // --- 密钥管理 (加密存储) ---
  const secretData = encryptJson({ apiKey: 'sk-xxx', secret: 'yyy' });
  const secret = await db.secrets.create({
    tenant_id: tenant.id,
    name: 'OpenAI API Key',
    type: 'api_key',
    data_encrypted: secretData,
    created_by: user.id
  });
  glog.info('Created secret:', secret);

  // 解密读取
  const decryptedData = decryptJson(secret.data_encrypted);
  glog.info('Decrypted secret:', decryptedData);

  // --- Agent 管理 ---
  const agent = await db.agents.create({
    tenant_id: tenant.id,
    name: 'Assistant',
    model: 'gpt-4',
    system_prompt: 'You are a helpful assistant.',
    temperature: 0.7,
    created_by: user.id
  });
  glog.info('Created agent:', agent);

  // 添加工具
  const tool = await db.agentTools.create({
    agent_id: agent.id,
    tenant_id: tenant.id,
    name: 'web_search',
    type: 'builtin',
    config: { maxResults: 5 }
  });
  glog.info('Created agent tool:', tool);

  // 添加 MCP
  const mcp = await db.agentMcps.create({
    agent_id: agent.id,
    tenant_id: tenant.id,
    name: 'AWS Docs',
    server_command: 'uvx',
    server_args: ['awslabs.aws-documentation-mcp-server@latest'],
    auto_approve: ['search_docs']
  });
  glog.info('Created agent MCP:', mcp);

  // --- 存储引擎 ---
  const storageConfig = encryptJson({
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: 'AKIA...',
    secretAccessKey: '...'
  });
  const storage = await db.storageEngines.create({
    tenant_id: tenant.id,
    name: 'S3 Production',
    type: 's3',
    config_encrypted: storageConfig,
    is_default: true,
    created_by: user.id
  });
  glog.info('Created storage:', storage);

  // --- 文件管理 ---
  const file = await db.files.create({
    tenant_id: tenant.id,
    storage_id: storage.id,
    name: 'document.pdf',
    original_name: 'My Document.pdf',
    mime_type: 'application/pdf',
    size: 1024000,
    path: '/uploads/2024/12/document.pdf',
    uploaded_by: user.id
  });
  glog.info('Created file:', file);

  // --- 标签管理 ---
  const tag = await db.tags.create({
    tenant_id: tenant.id,
    name: 'Production',
    color: '#10B981',
    entity_type: 'workflow'
  });
  glog.info('Created tag:', tag);

  // 关联标签
  await db.entityTags.addTag(workflow.id, 'workflow', tag.id);
  const workflowTags = await db.entityTags.findTagsByEntity(workflow.id, 'workflow');
  glog.info('Workflow tags:', workflowTags);

  // --- 表单管理 ---
  const form = await db.forms.create({
    tenant_id: tenant.id,
    name: 'Contact Form',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        email: { type: 'string', format: 'email', title: 'Email' },
        message: { type: 'string', title: 'Message' }
      },
      required: ['name', 'email']
    },
    created_by: user.id
  });
  glog.info('Created form:', form);

  // 表单提交
  const submission = await db.formSubmissions.create({
    form_id: form.id,
    tenant_id: tenant.id,
    data: { name: 'John', email: 'john@example.com', message: 'Hello!' },
    ip_address: '127.0.0.1'
  });
  glog.info('Created submission:', submission);

  // --- 事务示例 ---
  await db.transaction(async () => {
    await db.workflows.update(workflow.id, { status: 'active' });
    await db.workflows.incrementVersion(workflow.id);
  });

  glog.info('Transaction completed');
}

// ==================== 运行示例 ====================

async function main() {
  const db = await initDatabase();
  
  try {
    await examples(db);
  } finally {
    await db.close();
  }
}

// 如果直接运行此文件
// main().catch(console.error);

export { initDatabase, examples };
