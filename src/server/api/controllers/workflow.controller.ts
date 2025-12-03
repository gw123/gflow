/**
 * Workflow Controller - 工作流控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database, ErrorCodes } from '../../db';
import { ServerWorkflowEngine } from '../../engine';

export class WorkflowController {
  constructor(private db: Database) {}

  /**
   * 获取工作流列表
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { status } = req.query;

    let result;
    if (status) {
      result = await this.db.workflows.findByStatus(
        tenantId,
        status as any,
        { limit, offset }
      );
    } else {
      result = await this.db.workflows.findAll(tenantId, { limit, offset });
    }

    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个工作流
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const workflow = await this.db.workflows.findById(id);
    if (!workflow) {
      throw ApiException.notFound('Workflow');
    }

    // 检查租户权限
    if (workflow.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    return success(res, workflow);
  };

  /**
   * 创建工作流
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, description, content, is_template } = req.body;

    const workflow = await this.db.workflows.create({
      tenant_id: tenantId,
      name,
      description,
      content,
      is_template: is_template || false,
      created_by: userId
    });

    return created(res, workflow);
  };

  /**
   * 更新工作流
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, description, content, status, is_template } = req.body;

    // 检查工作流是否存在
    const existing = await this.db.workflows.findById(id);
    if (!existing) {
      throw ApiException.notFound('Workflow');
    }

    // 检查租户权限
    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.workflows.update(id, {
      name,
      description,
      content,
      status,
      is_template,
      updated_by: userId
    });

    return success(res, updated);
  };

  /**
   * 删除工作流
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // 检查工作流是否存在
    const existing = await this.db.workflows.findById(id);
    if (!existing) {
      throw ApiException.notFound('Workflow');
    }

    // 检查租户权限
    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.workflows.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 执行工作流
   */
  execute = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { input } = req.body;
    const tenantId = req.tenantId!;
    const userId = req.user?.id;

    // 获取工作流
    const workflow = await this.db.workflows.findById(id);
    if (!workflow) {
      throw ApiException.notFound('Workflow');
    }

    // 检查租户权限
    if (workflow.tenant_id !== tenantId) {
      throw ApiException.forbidden();
    }

    // 创建执行记录
    const execution = await this.db.workflowExecutions.create({
      workflow_id: id,
      tenant_id: tenantId,
      trigger_type: 'manual',
      trigger_by: userId,
      input_data: input
    });

    try {
      // 执行工作流
      const engine = new ServerWorkflowEngine(workflow.content);
      const result = await engine.run();

      // 更新执行记录
      await this.db.workflowExecutions.update(execution.id, {
        status: 'success',
        output_data: result.results,
        logs: result.logs,
        finished_at: new Date(),
        duration_ms: Date.now() - new Date(execution.created_at).getTime()
      });

      return success(res, {
        executionId: execution.id,
        status: 'success',
        results: result.results,
        logs: result.logs
      });
    } catch (err: any) {
      // 更新执行记录为失败
      await this.db.workflowExecutions.update(execution.id, {
        status: 'error',
        error_message: err.message,
        finished_at: new Date()
      });

      throw new ApiException(
        ErrorCodes.WORKFLOW_EXECUTION_FAILED,
        `Workflow execution failed: ${err.message}`,
        500
      );
    }
  };

  /**
   * 直接执行工作流 (不保存执行记录)
   */
  executeInline = async (req: AuthRequest, res: Response) => {
    const { workflow } = req.body;

    if (!workflow) {
      throw ApiException.badRequest('Workflow content is required');
    }

    try {
      const engine = new ServerWorkflowEngine(workflow);
      const result = await engine.run();

      return success(res, {
        status: 'success',
        results: result.results,
        logs: result.logs
      });
    } catch (err: any) {
      throw new ApiException(
        ErrorCodes.WORKFLOW_EXECUTION_FAILED,
        `Workflow execution failed: ${err.message}`,
        500
      );
    }
  };

  /**
   * 获取工作流执行历史
   */
  getExecutions = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { limit, offset } = parsePagination(req.query);

    // 检查工作流是否存在
    const workflow = await this.db.workflows.findById(id);
    if (!workflow) {
      throw ApiException.notFound('Workflow');
    }

    // 检查租户权限
    if (workflow.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const result = await this.db.workflowExecutions.findByWorkflowId(id, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取执行统计
   */
  getStats = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    const stats = await this.db.workflowExecutions.getStats(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return success(res, stats);
  };

  /**
   * 获取模板列表
   */
  getTemplates = async (req: AuthRequest, res: Response) => {
    const { limit, offset } = parsePagination(req.query);
    
    const result = await this.db.workflows.findTemplates({ limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };
}
