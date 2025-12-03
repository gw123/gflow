/**
 * Storage & File Repositories - 存储和文件数据访问
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { StorageEngine, File } from '../types';
import {
  StorageEngineRepository as IStorageEngineRepository,
  FileRepository as IFileRepository,
  CreateStorageEngineDTO, UpdateStorageEngineDTO,
  CreateFileDTO, UpdateFileDTO,
  QueryOptions, PaginatedResult
} from '../interface';
import { BaseRepository } from './base';

export class StorageEngineRepository extends BaseRepository<StorageEngine, CreateStorageEngineDTO, UpdateStorageEngineDTO> implements IStorageEngineRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'storage_engines');
  }

  /**
   * 查找默认存储引擎
   */
  async findDefault(tenantId: string): Promise<StorageEngine | null> {
    return this.findOneWhere({ tenant_id: tenantId, is_default: true });
  }

  /**
   * 设置默认存储引擎
   */
  async setDefault(tenantId: string, id: string): Promise<void> {
    // 先取消所有默认
    const resetSql = `
      UPDATE ${this.tableName}
      SET is_default = FALSE
      WHERE tenant_id = ${this.db.getPlaceholder(1)}
    `;
    await this.db.execute(resetSql, [tenantId]);

    // 设置新的默认
    const setSql = `
      UPDATE ${this.tableName}
      SET is_default = TRUE
      WHERE id = ${this.db.getPlaceholder(1)}
    `;
    await this.db.execute(setSql, [id]);
  }
}

export class FileRepository extends BaseRepository<File, CreateFileDTO, UpdateFileDTO> implements IFileRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'files');
  }

  /**
   * 根据存储引擎 ID 查找文件
   */
  async findByStorageId(storageId: string, options?: QueryOptions): Promise<PaginatedResult<File>> {
    return this.findWhere({ storage_id: storageId }, options);
  }

  /**
   * 根据 MIME 类型查找文件
   */
  async findByMimeType(tenantId: string, mimeType: string, options: QueryOptions = {}): Promise<PaginatedResult<File>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = options;
    
    // 支持通配符匹配，如 'image/*'
    const mimePattern = mimeType.includes('*') 
      ? mimeType.replace('*', '%') 
      : mimeType;

    const countSql = `
      SELECT COUNT(*) as total FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND mime_type LIKE ${this.db.getPlaceholder(2)}
    `;
    const countResult = await this.db.query<{ total: number }>(countSql, [tenantId, mimePattern]);
    const total = Number(countResult[0]?.total || 0);

    const dataSql = `
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)} AND mime_type LIKE ${this.db.getPlaceholder(2)}
      ORDER BY ${orderBy} ${orderDir.toUpperCase()}
      LIMIT ${this.db.getPlaceholder(3)} OFFSET ${this.db.getPlaceholder(4)}
    `;
    const data = await this.db.query<File>(dataSql, [tenantId, mimePattern, limit, offset]);

    return { data, total, limit, offset };
  }

  /**
   * 获取存储使用统计
   */
  async getStorageStats(tenantId: string): Promise<{ totalFiles: number; totalSize: number }> {
    const sql = `
      SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size
      FROM ${this.tableName}
      WHERE tenant_id = ${this.db.getPlaceholder(1)}
    `;
    const result = await this.db.query<any>(sql, [tenantId]);
    return {
      totalFiles: Number(result[0]?.total_files || 0),
      totalSize: Number(result[0]?.total_size || 0)
    };
  }
}
