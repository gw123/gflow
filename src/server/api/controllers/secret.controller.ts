/**
 * Secret Controller - 密钥控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';
import { encryptJson, decryptJson } from '../../db/utils';

export class SecretController {
  constructor(private db: Database) {}

  /**
   * 获取密钥列表 (不返回实际数据)
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { type } = req.query;

    let secrets;
    if (type) {
      secrets = await this.db.secrets.findByType(tenantId, type as string);
      return success(res, secrets.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        description: s.description,
        created_at: s.created_at,
        updated_at: s.updated_at
      })));
    }

    const result = await this.db.secrets.findAll(tenantId, { limit, offset });
    
    // 不返回加密数据
    const safeSecrets = result.data.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      created_at: s.created_at,
      updated_at: s.updated_at
    }));

    return paginated(res, safeSecrets, result.total, limit, offset);
  };

  /**
   * 获取单个密钥 (不返回实际数据)
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const secret = await this.db.secrets.findById(id);
    if (!secret) {
      throw ApiException.notFound('Secret');
    }

    // 检查租户权限
    if (secret.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 不返回加密数据
    return success(res, {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      description: secret.description,
      created_at: secret.created_at,
      updated_at: secret.updated_at
    });
  };

  /**
   * 创建密钥
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, type, data, description } = req.body;

    // 加密数据
    const encryptedData = encryptJson(data);

    const secret = await this.db.secrets.create({
      tenant_id: tenantId,
      name,
      type,
      data_encrypted: encryptedData,
      description,
      created_by: userId
    });

    // 不返回加密数据
    return created(res, {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      description: secret.description,
      created_at: secret.created_at
    });
  };

  /**
   * 更新密钥
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, type, data, description } = req.body;

    // 检查密钥是否存在
    const existing = await this.db.secrets.findById(id);
    if (!existing) {
      throw ApiException.notFound('Secret');
    }

    // 检查租户权限
    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updateData: any = { name, type, description };
    
    // 如果提供了新数据，加密它
    if (data) {
      updateData.data_encrypted = encryptJson(data);
    }

    const updated = await this.db.secrets.update(id, updateData);

    // 不返回加密数据
    return success(res, {
      id: updated!.id,
      name: updated!.name,
      type: updated!.type,
      description: updated!.description,
      updated_at: updated!.updated_at
    });
  };

  /**
   * 删除密钥
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // 检查密钥是否存在
    const existing = await this.db.secrets.findById(id);
    if (!existing) {
      throw ApiException.notFound('Secret');
    }

    // 检查租户权限
    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.secrets.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 获取密钥数据 (仅限管理员)
   */
  getData = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // 检查权限
    if (req.user?.role !== 'admin') {
      throw ApiException.forbidden('Admin access required');
    }

    const secret = await this.db.secrets.findById(id);
    if (!secret) {
      throw ApiException.notFound('Secret');
    }

    // 检查租户权限
    if (secret.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 解密数据
    const decryptedData = decryptJson(secret.data_encrypted);

    return success(res, {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      data: decryptedData
    });
  };
}
