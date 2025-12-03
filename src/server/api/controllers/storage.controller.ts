/**
 * Storage & File Controller - 存储和文件控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';
import { encryptJson, decryptJson } from '../../db/utils';

export class StorageController {
  constructor(private db: Database) {}

  // ==================== Storage Engine ====================

  /**
   * 获取存储引擎列表
   */
  listEngines = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);

    const result = await this.db.storageEngines.findAll(tenantId, { limit, offset });
    
    // 不返回加密配置
    const safeEngines = result.data.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      is_default: e.is_default,
      status: e.status,
      created_at: e.created_at,
      updated_at: e.updated_at
    }));

    return paginated(res, safeEngines, result.total, limit, offset);
  };

  /**
   * 获取单个存储引擎
   */
  getEngine = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const engine = await this.db.storageEngines.findById(id);
    if (!engine) {
      throw ApiException.notFound('Storage engine');
    }

    if (engine.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 不返回加密配置
    return success(res, {
      id: engine.id,
      name: engine.name,
      type: engine.type,
      is_default: engine.is_default,
      status: engine.status,
      created_at: engine.created_at,
      updated_at: engine.updated_at
    });
  };

  /**
   * 创建存储引擎
   */
  createEngine = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { name, type, config, is_default } = req.body;

    // 加密配置
    const encryptedConfig = encryptJson(config);

    const engine = await this.db.storageEngines.create({
      tenant_id: tenantId,
      name,
      type,
      config_encrypted: encryptedConfig,
      is_default: is_default || false,
      created_by: userId
    });

    // 如果设为默认，更新其他引擎
    if (is_default) {
      await this.db.storageEngines.setDefault(tenantId, engine.id);
    }

    return created(res, {
      id: engine.id,
      name: engine.name,
      type: engine.type,
      is_default: engine.is_default,
      status: engine.status,
      created_at: engine.created_at
    });
  };

  /**
   * 更新存储引擎
   */
  updateEngine = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { name, config, is_default, status } = req.body;

    const existing = await this.db.storageEngines.findById(id);
    if (!existing) {
      throw ApiException.notFound('Storage engine');
    }

    if (existing.tenant_id !== tenantId) {
      throw ApiException.forbidden();
    }

    const updateData: any = { name, status };
    
    if (config) {
      updateData.config_encrypted = encryptJson(config);
    }

    const updated = await this.db.storageEngines.update(id, updateData);

    // 如果设为默认
    if (is_default) {
      await this.db.storageEngines.setDefault(tenantId, id);
    }

    return success(res, {
      id: updated!.id,
      name: updated!.name,
      type: updated!.type,
      is_default: is_default || updated!.is_default,
      status: updated!.status,
      updated_at: updated!.updated_at
    });
  };

  /**
   * 删除存储引擎
   */
  deleteEngine = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.storageEngines.findById(id);
    if (!existing) {
      throw ApiException.notFound('Storage engine');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // 检查是否有关联文件
    const files = await this.db.files.findByStorageId(id, { limit: 1 });
    if (files.total > 0) {
      throw ApiException.conflict('Cannot delete storage engine with existing files');
    }

    await this.db.storageEngines.delete(id);
    return success(res, { deleted: true });
  };

  // ==================== Files ====================

  /**
   * 获取文件列表
   */
  listFiles = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { storageId, mimeType } = req.query;

    let result;
    if (storageId) {
      result = await this.db.files.findByStorageId(storageId as string, { limit, offset });
    } else if (mimeType) {
      result = await this.db.files.findByMimeType(tenantId, mimeType as string, { limit, offset });
    } else {
      result = await this.db.files.findAll(tenantId, { limit, offset });
    }

    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个文件
   */
  getFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const file = await this.db.files.findById(id);
    if (!file) {
      throw ApiException.notFound('File');
    }

    if (file.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    return success(res, file);
  };

  /**
   * 创建文件记录
   */
  createFile = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { storage_id, name, original_name, mime_type, size, path, url, metadata } = req.body;

    // 验证存储引擎
    const storage = await this.db.storageEngines.findById(storage_id);
    if (!storage || storage.tenant_id !== tenantId) {
      throw ApiException.notFound('Storage engine');
    }

    const file = await this.db.files.create({
      tenant_id: tenantId,
      storage_id,
      name,
      original_name,
      mime_type,
      size,
      path,
      url,
      metadata,
      uploaded_by: userId
    });

    return created(res, file);
  };

  /**
   * 更新文件
   */
  updateFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, metadata } = req.body;

    const existing = await this.db.files.findById(id);
    if (!existing) {
      throw ApiException.notFound('File');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.files.update(id, { name, metadata });
    return success(res, updated);
  };

  /**
   * 删除文件
   */
  deleteFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.files.findById(id);
    if (!existing) {
      throw ApiException.notFound('File');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    // TODO: 实际删除存储中的文件

    await this.db.files.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 获取存储统计
   */
  getStats = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    
    const stats = await this.db.files.getStorageStats(tenantId);
    return success(res, stats);
  };
}
