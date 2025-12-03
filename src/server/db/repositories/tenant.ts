/**
 * Tenant Repository - 租户数据访问
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { Tenant } from '../types';
import { TenantRepository as ITenantRepository, CreateTenantDTO, UpdateTenantDTO, QueryOptions, PaginatedResult } from '../interface';
import { BaseRepository } from './base';

export class TenantRepository extends BaseRepository<Tenant, CreateTenantDTO, UpdateTenantDTO> implements ITenantRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'tenants');
  }

  /**
   * 查找所有租户 (不需要 tenant_id 过滤)
   */
  async findAll(_tenantId: string, options: QueryOptions = {}): Promise<PaginatedResult<Tenant>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = options;
    
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const countResult = await this.db.query<{ total: number }>(countSql);
    const total = Number(countResult[0]?.total || 0);

    const dataSql = `
      SELECT * FROM ${this.tableName}
      ORDER BY ${orderBy} ${orderDir.toUpperCase()}
      LIMIT ${this.db.getPlaceholder(1)} OFFSET ${this.db.getPlaceholder(2)}
    `;
    const data = await this.db.query<Tenant>(dataSql, [limit, offset]);

    return { data, total, limit, offset };
  }

  /**
   * 根据 slug 查找租户
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.findOneWhere({ slug });
  }
}
