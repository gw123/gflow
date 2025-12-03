/**
 * Form Controller - 表单控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';

export class FormController {
  constructor(private db: Database) {}

  // ==================== Form CRUD ====================

  /**
   * 获取表单列表
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { published } = req.query;

    if (published === 'true') {
      const forms = await this.db.forms.findPublished(tenantId);
      return success(res, forms);
    }

    const result = await this.db.forms.findAll(tenantId, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个表单
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const form = await this.db.forms.findById(id);
    if (!form) {
      throw ApiException.notFound('Form');
    }

    if (form.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    return success(res, form);
  };

  /**
   * 创建表单
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, description, schema, ui_schema, default_values, settings } = req.body;

    const form = await this.db.forms.create({
      tenant_id: tenantId,
      name,
      description,
      schema,
      ui_schema,
      default_values,
      settings,
      created_by: userId
    });

    return created(res, form);
  };

  /**
   * 更新表单
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, schema, ui_schema, default_values, settings, status } = req.body;

    const existing = await this.db.forms.findById(id);
    if (!existing) {
      throw ApiException.notFound('Form');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.forms.update(id, {
      name, description, schema, ui_schema, default_values, settings, status
    });

    return success(res, updated);
  };

  /**
   * 删除表单
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.forms.findById(id);
    if (!existing) {
      throw ApiException.notFound('Form');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.forms.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 发布表单
   */
  publish = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.forms.findById(id);
    if (!existing) {
      throw ApiException.notFound('Form');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.forms.update(id, { status: 'published' });
    return success(res, updated);
  };

  // ==================== Form Submissions ====================

  /**
   * 获取表单提交列表
   */
  listSubmissions = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { limit, offset } = parsePagination(req.query);

    const form = await this.db.forms.findById(id);
    if (!form || form.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Form');
    }

    const result = await this.db.formSubmissions.findByFormId(id, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 提交表单 (公开接口)
   */
  submit = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { data } = req.body;

    const form = await this.db.forms.findById(id);
    if (!form) {
      throw ApiException.notFound('Form');
    }

    // 检查表单是否已发布
    if (form.status !== 'published') {
      throw ApiException.badRequest('Form is not published');
    }

    // TODO: 验证数据是否符合 schema

    const submission = await this.db.formSubmissions.create({
      form_id: id,
      tenant_id: form.tenant_id,
      data,
      submitted_by: req.user?.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    return created(res, submission);
  };

  /**
   * 获取单个提交
   */
  getSubmission = async (req: AuthRequest, res: Response) => {
    const { id, submissionId } = req.params;

    const form = await this.db.forms.findById(id);
    if (!form || form.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Form');
    }

    const submission = await this.db.formSubmissions.findById(submissionId);
    if (!submission || submission.form_id !== id) {
      throw ApiException.notFound('Submission');
    }

    return success(res, submission);
  };

  /**
   * 删除提交
   */
  deleteSubmission = async (req: AuthRequest, res: Response) => {
    const { id, submissionId } = req.params;

    const form = await this.db.forms.findById(id);
    if (!form || form.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Form');
    }

    const submission = await this.db.formSubmissions.findById(submissionId);
    if (!submission || submission.form_id !== id) {
      throw ApiException.notFound('Submission');
    }

    await this.db.formSubmissions.delete(submissionId);
    return success(res, { deleted: true });
  };
}
