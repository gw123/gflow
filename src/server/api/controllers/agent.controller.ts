/**
 * Agent Controller - Agent 控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';

export class AgentController {
  constructor(private db: Database) {}

  // ==================== Agent CRUD ====================

  /**
   * 获取 Agent 列表
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { active } = req.query;

    if (active === 'true') {
      const agents = await this.db.agents.findActive(tenantId);
      return success(res, agents);
    }

    const result = await this.db.agents.findAll(tenantId, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个 Agent
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const agent = await this.db.agents.findById(id);
    if (!agent) {
      throw ApiException.notFound('Agent');
    }

    if (agent.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 获取关联的工具和 MCP
    const tools = await this.db.agentTools.findByAgentId(id);
    const mcps = await this.db.agentMcps.findByAgentId(id);

    return success(res, { ...agent, tools, mcps });
  };

  /**
   * 创建 Agent
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, description, model, system_prompt, temperature, max_tokens, settings } = req.body;

    const agent = await this.db.agents.create({
      tenant_id: tenantId,
      name,
      description,
      model,
      system_prompt,
      temperature,
      max_tokens,
      settings,
      created_by: userId
    });

    return created(res, agent);
  };

  /**
   * 更新 Agent
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, model, system_prompt, temperature, max_tokens, settings, status } = req.body;

    const existing = await this.db.agents.findById(id);
    if (!existing) {
      throw ApiException.notFound('Agent');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.agents.update(id, {
      name, description, model, system_prompt, temperature, max_tokens, settings, status
    });

    return success(res, updated);
  };

  /**
   * 删除 Agent
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.agents.findById(id);
    if (!existing) {
      throw ApiException.notFound('Agent');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.agents.delete(id);
    return success(res, { deleted: true });
  };

  // ==================== Agent Tools ====================

  /**
   * 获取 Agent 工具列表
   */
  listTools = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const agent = await this.db.agents.findById(id);
    if (!agent || agent.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Agent');
    }

    const tools = await this.db.agentTools.findByAgentId(id);
    return success(res, tools);
  };

  /**
   * 添加 Agent 工具
   */
  addTool = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { name, type, description, config, enabled } = req.body;

    const agent = await this.db.agents.findById(id);
    if (!agent || agent.tenant_id !== tenantId) {
      throw ApiException.notFound('Agent');
    }

    const tool = await this.db.agentTools.create({
      agent_id: id,
      tenant_id: tenantId,
      name,
      type,
      description,
      config,
      enabled: enabled ?? true
    });

    return created(res, tool);
  };

  /**
   * 更新 Agent 工具
   */
  updateTool = async (req: AuthRequest, res: Response) => {
    const { id, toolId } = req.params;
    const { name, description, config, enabled } = req.body;

    const tool = await this.db.agentTools.findById(toolId);
    if (!tool || tool.agent_id !== id || tool.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Tool');
    }

    const updated = await this.db.agentTools.update(toolId, { name, description, config, enabled });
    return success(res, updated);
  };

  /**
   * 删除 Agent 工具
   */
  deleteTool = async (req: AuthRequest, res: Response) => {
    const { id, toolId } = req.params;

    const tool = await this.db.agentTools.findById(toolId);
    if (!tool || tool.agent_id !== id || tool.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Tool');
    }

    await this.db.agentTools.delete(toolId);
    return success(res, { deleted: true });
  };

  // ==================== Agent MCP ====================

  /**
   * 获取 Agent MCP 列表
   */
  listMcps = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const agent = await this.db.agents.findById(id);
    if (!agent || agent.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Agent');
    }

    const mcps = await this.db.agentMcps.findByAgentId(id);
    return success(res, mcps);
  };

  /**
   * 添加 Agent MCP
   */
  addMcp = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { name, server_command, server_args, env_vars, auto_approve, enabled } = req.body;

    const agent = await this.db.agents.findById(id);
    if (!agent || agent.tenant_id !== tenantId) {
      throw ApiException.notFound('Agent');
    }

    const mcp = await this.db.agentMcps.create({
      agent_id: id,
      tenant_id: tenantId,
      name,
      server_command,
      server_args,
      env_vars,
      auto_approve,
      enabled: enabled ?? true
    });

    return created(res, mcp);
  };

  /**
   * 更新 Agent MCP
   */
  updateMcp = async (req: AuthRequest, res: Response) => {
    const { id, mcpId } = req.params;
    const { name, server_command, server_args, env_vars, auto_approve, enabled } = req.body;

    const mcp = await this.db.agentMcps.findById(mcpId);
    if (!mcp || mcp.agent_id !== id || mcp.tenant_id !== req.tenantId) {
      throw ApiException.notFound('MCP');
    }

    const updated = await this.db.agentMcps.update(mcpId, {
      name, server_command, server_args, env_vars, auto_approve, enabled
    });
    return success(res, updated);
  };

  /**
   * 删除 Agent MCP
   */
  deleteMcp = async (req: AuthRequest, res: Response) => {
    const { id, mcpId } = req.params;

    const mcp = await this.db.agentMcps.findById(mcpId);
    if (!mcp || mcp.agent_id !== id || mcp.tenant_id !== req.tenantId) {
      throw ApiException.notFound('MCP');
    }

    await this.db.agentMcps.delete(mcpId);
    return success(res, { deleted: true });
  };
}
