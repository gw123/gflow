/**
 * Agent Repositories - Agent 相关数据访问
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { Agent, AgentTool, AgentMcp } from '../types';
import {
  AgentRepository as IAgentRepository,
  AgentToolRepository as IAgentToolRepository,
  AgentMcpRepository as IAgentMcpRepository,
  CreateAgentDTO, UpdateAgentDTO,
  CreateAgentToolDTO, UpdateAgentToolDTO,
  CreateAgentMcpDTO, UpdateAgentMcpDTO
} from '../interface';
import { BaseRepository } from './base';

export class AgentRepository extends BaseRepository<Agent, CreateAgentDTO, UpdateAgentDTO> implements IAgentRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'agents');
  }

  /**
   * 查找活跃的 Agent
   */
  async findActive(tenantId: string): Promise<Agent[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND status = 'active'
      ORDER BY created_at DESC
    `;
    return this.db.query<Agent>(sql, [tenantId]);
  }
}

export class AgentToolRepository extends BaseRepository<AgentTool, CreateAgentToolDTO, UpdateAgentToolDTO> implements IAgentToolRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'agent_tools');
  }

  /**
   * 根据 Agent ID 查找工具
   */
  async findByAgentId(agentId: string): Promise<AgentTool[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE agent_id = ${this.db.getPlaceholder(1)}
      ORDER BY created_at ASC
    `;
    return this.db.query<AgentTool>(sql, [agentId]);
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET enabled = ${this.db.getPlaceholder(1)}, updated_at = ${this.db.getNowSQL()}
      WHERE id = ${this.db.getPlaceholder(2)}
    `;
    await this.db.execute(sql, [enabled, id]);
  }
}

export class AgentMcpRepository extends BaseRepository<AgentMcp, CreateAgentMcpDTO, UpdateAgentMcpDTO> implements IAgentMcpRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'agent_mcps');
  }

  /**
   * 根据 Agent ID 查找 MCP 配置
   */
  async findByAgentId(agentId: string): Promise<AgentMcp[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE agent_id = ${this.db.getPlaceholder(1)}
      ORDER BY created_at ASC
    `;
    return this.db.query<AgentMcp>(sql, [agentId]);
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET enabled = ${this.db.getPlaceholder(1)}, updated_at = ${this.db.getNowSQL()}
      WHERE id = ${this.db.getPlaceholder(2)}
    `;
    await this.db.execute(sql, [enabled, id]);
  }
}
