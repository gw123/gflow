/**
 * Tag Controller - 标签控制器
 */

import { Response } from 'express';
import { AuthRequest, parsePagination } from '../types';
import { success, created, paginated, ApiException } from '../response';
import { Database } from '../../db';

export class TagController {
  constructor(private db: Database) {}

  /**
   * 获取标签列表
   */
  list = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { limit, offset } = parsePagination(req.query);
    const { entityType } = req.query;

    if (entityType) {
      const tags = await this.db.tags.findByEntityType(tenantId, entityType as any);
      return success(res, tags);
    }

    const result = await this.db.tags.findAll(tenantId, { limit, offset });
    return paginated(res, result.data, result.total, limit, offset);
  };

  /**
   * 获取单个标签
   */
  get = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const tag = await this.db.tags.findById(id);
    if (!tag) {
      throw ApiException.notFound('Tag');
    }

    if (tag.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    return success(res, tag);
  };

  /**
   * 创建标签
   */
  create = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { name, color, entity_type } = req.body;

    const tag = await this.db.tags.create({
      tenant_id: tenantId,
      name,
      color,
      entity_type
    });

    return created(res, tag);
  };

  /**
   * 更新标签
   */
  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, color } = req.body;

    const existing = await this.db.tags.findById(id);
    if (!existing) {
      throw ApiException.notFound('Tag');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    const updated = await this.db.tags.update(id, { name, color });
    return success(res, updated);
  };

  /**
   * 删除标签
   */
  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await this.db.tags.findById(id);
    if (!existing) {
      throw ApiException.notFound('Tag');
    }

    if (existing.tenant_id !== req.tenantId) {
      throw ApiException.forbidden();
    }

    await this.db.tags.delete(id);
    return success(res, { deleted: true });
  };

  /**
   * 为实体添加标签
   */
  addToEntity = async (req: AuthRequest, res: Response) => {
    const { entityId, entityType, tagId } = req.body;

    // 验证标签存在
    const tag = await this.db.tags.findById(tagId);
    if (!tag || tag.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Tag');
    }

    // 验证实体类型匹配
    if (tag.entity_type !== entityType) {
      throw ApiException.badRequest('Tag entity type mismatch');
    }

    const entityTag = await this.db.entityTags.addTag(entityId, entityType, tagId);
    return created(res, entityTag);
  };

  /**
   * 从实体移除标签
   */
  removeFromEntity = async (req: AuthRequest, res: Response) => {
    const { entityId, tagId } = req.body;

    // 验证标签存在
    const tag = await this.db.tags.findById(tagId);
    if (!tag || tag.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Tag');
    }

    await this.db.entityTags.removeTag(entityId, tagId);
    return success(res, { removed: true });
  };

  /**
   * 获取实体的标签
   */
  getEntityTags = async (req: AuthRequest, res: Response) => {
    const { entityId, entityType } = req.query;

    if (!entityId || !entityType) {
      throw ApiException.badRequest('entityId and entityType are required');
    }

    const tags = await this.db.entityTags.findTagsByEntity(entityId as string, entityType as string);
    return success(res, tags);
  };

  /**
   * 获取标签关联的实体
   */
  getTagEntities = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const tag = await this.db.tags.findById(id);
    if (!tag || tag.tenant_id !== req.tenantId) {
      throw ApiException.notFound('Tag');
    }

    const entities = await this.db.entityTags.findEntitiesByTag(id);
    return success(res, entities);
  };
}
