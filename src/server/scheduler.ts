/**
 * Workflow Scheduler - 工作流调度器
 */

import cron from 'node-cron';
import { Database } from './db';
import { ServerWorkflowEngine } from './engine';

interface ScheduledJob {
  workflowId: string;
  job: cron.ScheduledTask;
}

export class WorkflowScheduler {
  private db: Database;
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    console.log('[Scheduler] Starting workflow scheduler...');
    await this.loadAndScheduleWorkflows();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('[Scheduler] Stopping workflow scheduler...');
    this.jobs.forEach(({ job }) => job.stop());
    this.jobs.clear();
  }

  /**
   * 重新加载调度
   */
  async reload(): Promise<void> {
    this.stop();
    await this.loadAndScheduleWorkflows();
  }

  /**
   * 加载并调度工作流
   */
  private async loadAndScheduleWorkflows(): Promise<void> {
    try {
      // 获取所有租户
      const tenants = await this.db.tenants.findAll('', { limit: 1000 });
      
      for (const tenant of tenants.data) {
        // 获取租户的活跃工作流
        const workflows = await this.db.workflows.findByStatus(tenant.id, 'active', { limit: 1000 });
        
        for (const workflow of workflows.data) {
          this.scheduleWorkflow(workflow);
        }
      }

      console.log(`[Scheduler] Loaded ${this.jobs.size} scheduled workflows`);
    } catch (err) {
      console.error('[Scheduler] Failed to load workflows:', err);
    }
  }

  /**
   * 调度单个工作流
   */
  private scheduleWorkflow(workflow: any): void {
    const content = workflow.content;
    if (!content || !content.nodes) return;

    // 查找 timer 节点
    const timerNode = content.nodes.find((n: any) => n.type === 'timer');
    if (!timerNode || !timerNode.parameters) return;

    let schedule: string | null = null;

    // 解析调度配置
    if (timerNode.parameters.cron) {
      schedule = timerNode.parameters.cron;
    } else if (timerNode.parameters.secondsInterval) {
      const seconds = parseInt(timerNode.parameters.secondsInterval);
      if (seconds >= 60) {
        // 转换为 cron 表达式 (最小粒度为分钟)
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
          schedule = `*/${minutes} * * * *`;
        } else {
          const hours = Math.floor(minutes / 60);
          schedule = `0 */${hours} * * *`;
        }
      }
    }

    // 验证并创建调度任务
    if (schedule && cron.validate(schedule)) {
      console.log(`[Scheduler] Scheduling workflow [${workflow.name}] with cron: ${schedule}`);
      
      const job = cron.schedule(schedule, async () => {
        await this.executeWorkflow(workflow);
      });

      this.jobs.set(workflow.id, { workflowId: workflow.id, job });
    }
  }

  /**
   * 执行工作流
   */
  private async executeWorkflow(workflow: any): Promise<void> {
    console.log(`[Scheduler] Triggering workflow: ${workflow.name}`);

    try {
      // 创建执行记录
      const execution = await this.db.workflowExecutions.create({
        workflow_id: workflow.id,
        tenant_id: workflow.tenant_id,
        trigger_type: 'schedule',
        trigger_by: 'system'
      });

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

      console.log(`[Scheduler] Workflow ${workflow.name} completed successfully`);
    } catch (err: any) {
      console.error(`[Scheduler] Workflow ${workflow.name} failed:`, err.message);

      // 记录失败
      try {
        const executions = await this.db.workflowExecutions.findByWorkflowId(workflow.id, { limit: 1 });
        if (executions.data.length > 0) {
          await this.db.workflowExecutions.update(executions.data[0].id, {
            status: 'error',
            error_message: err.message,
            finished_at: new Date()
          });
        }
      } catch {
        // 忽略记录失败的错误
      }
    }
  }

  /**
   * 手动触发工作流
   */
  async triggerWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.db.workflows.findById(workflowId);
    if (workflow) {
      await this.executeWorkflow(workflow);
    }
  }

  /**
   * 获取调度状态
   */
  getStatus(): { total: number; workflows: string[] } {
    return {
      total: this.jobs.size,
      workflows: Array.from(this.jobs.keys())
    };
  }
}
