/**
 * API Endpoint Controller - API 接口控制器
 */

import { Response } from 'express';
import axios from 'axios';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';
import { decryptJson } from '../../db/utils';

export class ApiController {
  constructor(private db: Database) {}

  /**
   * 获取 API 列表
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);

    const result = await this.db.apiEndpoints.findAll(tenantId, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个 API
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const api = await this.db.apiEndpoints.findById(id);
    if (!api) {
      throw ApiException.notFound('API');
    }

    if (api.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    return success(res, api);
  };

  /**
   * 创建 API
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, method, path, description, headers, query_params, body_template, auth_type, secret_id } = req.body;

    const api = await this.db.apiEndpoints.create({
      tenant_id: tenantId,
      name,
      method,
      path,
      description,
      headers,
      query_params,
      body_template,
      auth_type,
      secret_id,
      created_by: userId
    });

    return created(res, api);
  };

  /**
   * 更新 API
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, method, path, description, headers, query_params, body_template, auth_type, secret_id } = req.body;

    const existing = await this.db.apiEndpoints.findById(id);
    if (!existing) {
      throw ApiException.notFound('API');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.apiEndpoints.update(id, {
      name, method, path, description, headers, query_params, body_template, auth_type, secret_id
    });

    return success(res, updated);
  };

  /**
   * 删除 API
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.apiEndpoints.findById(id);
    if (!existing) {
      throw ApiException.notFound('API');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.apiEndpoints.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 测试 API
   */
  test = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { params, body: requestBody } = req.body;

    const api = await this.db.apiEndpoints.findById(id);
    if (!api) {
      throw ApiException.notFound('API');
    }

    if (api.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 构建请求头
    let headers = { ...api.headers };

    // 处理认证
    if (api.auth_type && api.auth_type !== 'none' && api.secret_id) {
      const secret = await this.db.secrets.findById(api.secret_id);
      if (secret) {
        const secretData = decryptJson(secret.data_encrypted);
        
        switch (api.auth_type) {
          case 'api_key':
            headers['X-API-Key'] = secretData.apiKey || secretData.key;
            break;
          case 'bearer':
            headers['Authorization'] = `Bearer ${secretData.token || secretData.apiKey}`;
            break;
          case 'basic':
            const auth = Buffer.from(`${secretData.username}:${secretData.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
            break;
        }
      }
    }

    try {
      const response = await axios({
        method: api.method.toLowerCase() as any,
        url: api.path,
        headers,
        params: { ...api.query_params, ...params },
        data: requestBody || api.body_template,
        validateStatus: () => true,
        timeout: 30000
      });

      return success(res, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
    } catch (err: any) {
      throw ApiException.badRequest(`API request failed: ${err.message}`);
    }
  };

  /**
   * 代理请求 (通用)
   */
  proxy = async (req: AuthRequest, res: Response) => {
    const { method, url, headers, body, params } = req.body;

    if (!url) {
      throw ApiException.badRequest('URL is required');
    }

    try {
      const response = await axios({
        method: method || 'GET',
        url,
        headers,
        data: body,
        params,
        validateStatus: () => true,
        timeout: 30000
      });

      return success(res, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
    } catch (err: any) {
      throw ApiException.badRequest(`Proxy request failed: ${err.message}`);
    }
  };
}
