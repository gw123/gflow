/**
 * Misc Repositories - 其他数据访问 (Secret, API, Tag, Form)
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { Secret, ApiEndpoint, Tag, EntityTag, Form, FormSubmission } from '../types';
import {
  SecretRepository as ISecretRepository,
  ApiEndpointRepository as IApiEndpointRepository,
  TagRepository as ITagRepository,
  EntityTagRepository as IEntityTagRepository,
  FormRepository as IFormRepository,
  FormSubmissionRepository as IFormSubmissionRepository,
  CreateSecretDTO, UpdateSecretDTO,
  CreateApiEndpointDTO, UpdateApiEndpointDTO,
  CreateTagDTO, UpdateTagDTO,
  CreateFormDTO, UpdateFormDTO,
  CreateFormSubmissionDTO,
  QueryOptions, PaginatedResult
} from '../interface';
import { BaseRepository } from './base';

// ==================== Secret Repository ====================

export class SecretRepository extends BaseRepository<Secret, CreateSecretDTO, UpdateSecretDTO> implements ISecretRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'secrets');
  }

  async findByType(tenantId: string, type: string): Promise<Secret[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND type = ${this.db.getPlaceholder(2)}
      ORDER BY created_at DESC
    `;
    return this.db.query<Secret>(sql, [tenantId, type]);
  }
}

// ==================== API Endpoint Repository ====================

export class ApiEndpointRepository extends BaseRepository<ApiEndpoint, CreateApiEndpointDTO, UpdateApiEndpointDTO> implements IApiEndpointRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'api_endpoints');
  }

  async findByPath(tenantId: string, method: string, path: string): Promise<ApiEndpoint | null> {
    return this.findOneWhere({ tenant_id: tenantId, method, path });
  }
}

// ==================== Tag Repository ====================

export class TagRepository extends BaseRepository<Tag, CreateTagDTO, UpdateTagDTO> implements ITagRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'tags');
  }

  async findByEntityType(tenantId: string, entityType: Tag['entity_type']): Promise<Tag[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND entity_type = ${this.db.getPlaceholder(2)}
      ORDER BY name ASC
    `;
    return this.db.query<Tag>(sql, [tenantId, entityType]);
  }
}

// ==================== Entity Tag Repository ====================

export class EntityTagRepository implements IEntityTagRepository {
  private db: BaseDatabaseAdapter;
  private tableName = 'entity_tags';

  constructor(db: BaseDatabaseAdapter) {
    this.db = db;
  }

  async addTag(entityId: string, entityType: string, tagId: string): Promise<EntityTag> {
    const id = this.db.generateId();
    const sql = `
      INSERT INTO ${this.tableName} (id, tag_id, entity_id, entity_type)
      VALUES (${this.db.getPlaceholder(1)}, ${this.db.getPlaceholder(2)}, ${this.db.getPlaceholder(3)}, ${this.db.getPlaceholder(4)})
    `;
    await this.db.execute(sql, [id, tagId, entityId, entityType]);
    
    return { id, tag_id: tagId, entity_id: entityId, entity_type: entityType, created_at: new Date() };
  }

  async removeTag(entityId: string, tagId: string): Promise<boolean> {
    const sql = `
      DELETE FROM ${this.tableName}
      WHERE entity_id = ${this.db.getPlaceholder(1)} AND tag_id = ${this.db.getPlaceholder(2)}
    `;
    const result = await this.db.execute(sql, [entityId, tagId]);
    return result.affectedRows > 0;
  }

  async findTagsByEntity(entityId: string, entityType: string): Promise<Tag[]> {
    const sql = `
      SELECT t.* FROM tags t
      INNER JOIN ${this.tableName} et ON t.id = et.tag_id
      WHERE et.entity_id = ${this.db.getPlaceholder(1)} AND et.entity_type = ${this.db.getPlaceholder(2)}
      ORDER BY t.name ASC
    `;
    return this.db.query<Tag>(sql, [entityId, entityType]);
  }

  async findEntitiesByTag(tagId: string): Promise<{ entityId: string; entityType: string }[]> {
    const sql = `
      SELECT entity_id, entity_type FROM ${this.tableName}
      WHERE tag_id = ${this.db.getPlaceholder(1)}
    `;
    const rows = await this.db.query<{ entity_id: string; entity_type: string }>(sql, [tagId]);
    return rows.map(r => ({ entityId: r.entity_id, entityType: r.entity_type }));
  }
}

// ==================== Form Repository ====================

export class FormRepository extends BaseRepository<Form, CreateFormDTO, UpdateFormDTO> implements IFormRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'forms');
  }

  async findPublished(tenantId: string): Promise<Form[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND status = 'published'
      ORDER BY created_at DESC
    `;
    return this.db.query<Form>(sql, [tenantId]);
  }
}

// ==================== Form Submission Repository ====================

export class FormSubmissionRepository extends BaseRepository<FormSubmission, CreateFormSubmissionDTO, never> implements IFormSubmissionRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'form_submissions');
  }

  async findByFormId(formId: string, options?: QueryOptions): Promise<PaginatedResult<FormSubmission>> {
    return this.findWhere({ form_id: formId }, options);
  }

  // 禁用更新操作
  async update(_id: string, _data: never): Promise<FormSubmission | null> {
    throw new Error('Form submissions cannot be updated');
  }
}
