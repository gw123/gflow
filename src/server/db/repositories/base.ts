/**
 * Base Repository - 通用 Repository 基类
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { QueryOptions, PaginatedResult } from '../interface';

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  protected db: BaseDatabaseAdapter;
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(db: BaseDatabaseAdapter, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * 根据 ID 查找
   */
  async findById(id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ${this.db.getPlaceholder(1)}`;
    const rows = await this.db.query<T>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * 查找所有记录 (带分页)
   */
  async findAll(tenantId: string, options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = options;
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE tenant_id = ${this.db.getPlaceholder(1)}`;
    const countResult = await this.db.query<{ total: number }>(countSql, [tenantId]);
    const total = Number(countResult[0]?.total || 0);

    // 获取数据
    const dataSql = `
      SELECT * FROM ${this.tableName} 
      WHERE tenant_id = ${this.db.getPlaceholder(1)}
      ORDER BY ${orderBy} ${orderDir.toUpperCase()}
      LIMIT ${this.db.getPlaceholder(2)} OFFSET ${this.db.getPlaceholder(3)}
    `;
    const data = await this.db.query<T>(dataSql, [tenantId, limit, offset]);

    return { data, total, limit, offset };
  }

  /**
   * 创建记录
   */
  async create(data: CreateDTO): Promise<T> {
    const id = this.db.generateId();
    const fields = Object.keys(data as object);
    const values = Object.values(data as object);
    
    // 添加 id 字段
    fields.unshift('id');
    values.unshift(id);

    const placeholders = this.db.buildPlaceholders(fields.length);
    const sql = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    await this.db.execute(sql, this.serializeValues(values));
    return this.findById(id) as Promise<T>;
  }

  /**
   * 更新记录
   */
  async update(id: string, data: UpdateDTO): Promise<T | null> {
    const fields = Object.keys(data as object);
    if (fields.length === 0) return this.findById(id);

    const values = Object.values(data as object);
    
    // 添加 updated_at
    fields.push('updated_at');
    values.push(new Date());

    const setClause = fields
      .map((f, i) => `${f} = ${this.db.getPlaceholder(i + 1)}`)
      .join(', ');

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = ${this.db.getPlaceholder(fields.length + 1)}
    `;

    await this.db.execute(sql, [...this.serializeValues(values), id]);
    return this.findById(id);
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ${this.db.getPlaceholder(1)}`;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 根据条件查找
   */
  protected async findWhere(
    conditions: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = options;
    
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((k, i) => `${k} = ${this.db.getPlaceholder(i + 1)}`)
      .join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await this.db.query<{ total: number }>(countSql, values);
    const total = Number(countResult[0]?.total || 0);

    // 获取数据
    const dataSql = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${orderDir.toUpperCase()}
      LIMIT ${this.db.getPlaceholder(keys.length + 1)} OFFSET ${this.db.getPlaceholder(keys.length + 2)}
    `;
    const data = await this.db.query<T>(dataSql, [...values, limit, offset]);

    return { data, total, limit, offset };
  }

  /**
   * 根据条件查找单条
   */
  protected async findOneWhere(conditions: Record<string, any>): Promise<T | null> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((k, i) => `${k} = ${this.db.getPlaceholder(i + 1)}`)
      .join(' AND ');

    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
    const rows = await this.db.query<T>(sql, values);
    return rows[0] || null;
  }

  /**
   * 序列化值 (处理 JSON 字段)
   */
  protected serializeValues(values: any[]): any[] {
    return values.map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'object' && !(v instanceof Date)) {
        return this.db.serializeJson(v);
      }
      return v;
    });
  }
}
