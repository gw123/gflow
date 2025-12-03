/**
 * Base Database Adapter - 数据库适配器基类
 */

import { DatabaseAdapter } from '../interface';
import { DatabaseType, getCreateTableSQL, getCreateIndexSQL } from '../schema';

export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  protected dbType: DatabaseType;
  protected connected: boolean = false;

  constructor(dbType: DatabaseType) {
    this.dbType = dbType;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract beginTransaction(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  abstract execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: string }>;

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 执行数据库迁移
   */
  async migrate(): Promise<void> {
    console.log(`[DB] Running migrations for ${this.dbType}...`);
    
    const tables = getCreateTableSQL(this.dbType);
    const indexes = getCreateIndexSQL(this.dbType);

    // 创建表
    for (const sql of tables) {
      try {
        await this.execute(sql);
      } catch (err: any) {
        console.error(`[DB] Migration error: ${err.message}`);
        throw err;
      }
    }

    // 创建索引
    for (const sql of indexes) {
      try {
        await this.execute(sql);
      } catch (err: any) {
        // 索引可能已存在，忽略错误
        if (!err.message.includes('already exists')) {
          console.warn(`[DB] Index warning: ${err.message}`);
        }
      }
    }

    console.log('[DB] Migrations completed successfully');
  }

  /**
   * 生成 UUID (跨数据库兼容)
   */
  generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 序列化 JSON 字段
   */
  serializeJson(value: any): string {
    if (value === null || value === undefined) return 'null';
    return JSON.stringify(value);
  }

  /**
   * 反序列化 JSON 字段
   */
  deserializeJson<T = any>(value: string | null): T | null {
    if (!value || value === 'null') return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * 获取当前时间戳 SQL
   */
  getNowSQL(): string {
    return this.dbType === 'postgres' ? 'NOW()' : "datetime('now')";
  }

  /**
   * 获取参数占位符
   */
  getPlaceholder(index: number): string {
    return this.dbType === 'postgres' ? `$${index}` : '?';
  }

  /**
   * 构建参数化查询的占位符列表
   */
  buildPlaceholders(count: number, startIndex: number = 1): string {
    return Array.from({ length: count }, (_, i) => this.getPlaceholder(startIndex + i)).join(', ');
  }
}
