/**
 * Workflow Repository - 工作流数据访问
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { Workflow, WorkflowExecution } from '../types';
import {
  WorkflowRepository as IWorkflowRepository,
  WorkflowExecutionRepository as IWorkflowExecutionRepository,
  CreateWorkflowDTO, UpdateWorkflowDTO,
  CreateWorkflowExecutionDTO, UpdateWorkflowExecutionDTO,
  QueryOptions, PaginatedResult, ExecutionStats
} from '../interface';
import { BaseRepository } from './base';

export class WorkflowRepository extends BaseRepository<Workflow, CreateWorkflowDTO, UpdateWorkflowDTO> implements IWorkflowRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'workflows');
  }

  /**
   * 根据状态查找工作流
   */
  async findByStatus(tenantId: string, status: Workflow['status'], options?: QueryOptions): Promise<PaginatedResult<Workflow>> {
    return this.findWhere({ tenant_id: tenantId, status }, options);
  }

  /**
   * 查找模板工作流
   */
  async findTemplates(options: QueryOptions = {}): Promise<PaginatedResult<Workflow>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = options;
    
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE is_template = TRUE`;
    const countResult = await this.db.query<{ total: number }>(countSql);
    const total = Number(countResult[0]?.total || 0);

    const dataSql = `
      SELECT * FROM ${this.tableName}
      WHERE is_template = TRUE
      ORDER BY ${orderBy} ${orderDir.toUpperCase()}
      LIMIT ${this.db.getPlaceholder(1)} OFFSET ${this.db.getPlaceholder(2)}
    `;
    const data = await this.db.query<Workflow>(dataSql, [limit, offset]);

    return { data, total, limit, offset };
  }

  /**
   * 增加版本号
   */
  async incrementVersion(id: string): Promise<number> {
    const sql = `
      UPDATE ${this.tableName}
      SET version = version + 1, updated_at = ${this.db.getNowSQL()}
      WHERE id = ${this.db.getPlaceholder(1)}
      RETURNING version
    `;
    const result = await this.db.query<{ version: number }>(sql, [id]);
    return result[0]?.version || 1;
  }
}

export class WorkflowExecutionRepository extends BaseRepository<WorkflowExecution, CreateWorkflowExecutionDTO, UpdateWorkflowExecutionDTO> implements IWorkflowExecutionRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'workflow_executions');
  }

  /**
   * 根据工作流 ID 查找执行记录
   */
  async findByWorkflowId(workflowId: string, options?: QueryOptions): Promise<PaginatedResult<WorkflowExecution>> {
    return this.findWhere({ workflow_id: workflowId }, options);
  }

  /**
   * 根据状态查找执行记录
   */
  async findByStatus(tenantId: string, status: WorkflowExecution['status'], options?: QueryOptions): Promise<PaginatedResult<WorkflowExecution>> {
    return this.findWhere({ tenant_id: tenantId, status }, options);
  }

  /**
   * 获取执行统计
   */
  async getStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<ExecutionStats> {
    let sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        AVG(duration_ms) as avg_duration
      FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)}
    `;
    
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND created_at >= ${this.db.getPlaceholder(paramIndex++)}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND created_at <= ${this.db.getPlaceholder(paramIndex++)}`;
      params.push(endDate);
    }

    const result = await this.db.query<any>(sql, params);
    const row = result[0] || {};

    return {
      total: Number(row.total || 0),
      success: Number(row.success || 0),
      error: Number(row.error || 0),
      pending: Number(row.pending || 0),
      running: Number(row.running || 0),
      avgDurationMs: Number(row.avg_duration || 0)
    };
  }

  /**
   * 开始执行
   */
  async startExecution(id: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'running', started_at = ${this.db.getNowSQL()}
      WHERE id = ${this.db.getPlaceholder(1)}
    `;
    await this.db.execute(sql, [id]);
  }

  /**
   * 完成执行
   */
  async finishExecution(id: string, status: 'success' | 'error', output?: any, error?: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET 
        status = ${this.db.getPlaceholder(1)},
        output_data = ${this.db.getPlaceholder(2)},
        error_message = ${this.db.getPlaceholder(3)},
        finished_at = ${this.db.getNowSQL()},
        duration_ms = EXTRACT(EPOCH FROM (${this.db.getNowSQL()} - started_at)) * 1000
      WHERE id = ${this.db.getPlaceholder(4)}
    `;
    await this.db.execute(sql, [
      status,
      output ? this.db.serializeJson(output) : null,
      error || null,
      id
    ]);
  }
}
