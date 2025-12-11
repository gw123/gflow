/**
 * SQLite Database Adapter
 */

import Database from 'better-sqlite3';
import path from 'path';
import { BaseDatabaseAdapter } from './base';
import { glog } from '../../../core/Logger';

export interface SQLiteConfig {
  filename?: string;  // 数据库文件路径，默认 ./data/workflow.db
  readonly?: boolean;
  verbose?: boolean;
}

export class SQLiteAdapter extends BaseDatabaseAdapter {
  private db: Database.Database | null = null;
  private config: SQLiteConfig;
  private inTransaction: boolean = false;
  private logger = glog.defaultLogger().named('SQLiteAdapter');

  constructor(config: SQLiteConfig = {}) {
    super('sqlite');
    this.config = {
      filename: config.filename || path.join(process.cwd(), 'data', 'workflow.db'),
      readonly: config.readonly || false,
      verbose: config.verbose || false
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.db) return;

    try {
      // 确保目录存在
      const dir = path.dirname(this.config.filename!);
      const fs = await import('fs');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.config.filename!, {
        readonly: this.config.readonly,
        verbose: this.config.verbose ? (message: any) => this.logger.debug(message) : undefined
      });

      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      // 启用 WAL 模式提升性能
      this.db.pragma('journal_mode = WAL');
      
      this.connected = true;
      this.logger.info(`Connected to ${this.config.filename}`);
    } catch (err: any) {
      this.logger.error(`Connection failed: ${err.message}`);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.connected = false;
      this.logger.info('Disconnected');
    }
  }

  async beginTransaction(): Promise<void> {
    this.ensureConnected();
    if (!this.inTransaction) {
      this.db!.exec('BEGIN TRANSACTION');
      this.inTransaction = true;
    }
  }

  async commit(): Promise<void> {
    this.ensureConnected();
    if (this.inTransaction) {
      this.db!.exec('COMMIT');
      this.inTransaction = false;
    }
  }

  async rollback(): Promise<void> {
    this.ensureConnected();
    if (this.inTransaction) {
      this.db!.exec('ROLLBACK');
      this.inTransaction = false;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureConnected();
    try {
      const stmt = this.db!.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return rows.map(row => this.parseJsonFields(row));
    } catch (err: any) {
      this.logger.error(`Query error: ${err.message}`, {
        sql: sql
      });
      throw err;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number; insertId?: string }> {
    this.ensureConnected();
    try {
      const stmt = this.db!.prepare(sql);
      const result = stmt.run(...params);
      return {
        affectedRows: result.changes,
        insertId: result.lastInsertRowid?.toString()
      };
    } catch (err: any) {
      this.logger.error(`Execute error: ${err.message}`, {
        sql: sql
      });
      throw err;
    }
  }

  /**
   * 同步执行查询 (SQLite 特有)
   */
  querySync<T = any>(sql: string, params: any[] = []): T[] {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params) as T[];
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 同步执行语句 (SQLite 特有)
   */
  executeSync(sql: string, params: any[] = []): { affectedRows: number; insertId?: string } {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = stmt.run(...params);
    return {
      affectedRows: result.changes,
      insertId: result.lastInsertRowid?.toString()
    };
  }

  private ensureConnected(): void {
    if (!this.connected || !this.db) {
      throw new Error('[SQLite] Database not connected');
    }
  }

  /**
   * 解析 JSON 字段
   */
  private parseJsonFields<T>(row: T): T {
    if (!row || typeof row !== 'object') return row;
    
    const jsonFields = [
      'settings', 'content', 'input_data', 'output_data', 'node_results', 
      'logs', 'headers', 'query_params', 'body_template', 'config',
      'server_args', 'env_vars', 'auto_approve', 'metadata', 'schema',
      'ui_schema', 'default_values', 'data'
    ];

    const parsed = { ...row } as any;
    for (const field of jsonFields) {
      if (field in parsed && typeof parsed[field] === 'string') {
        parsed[field] = this.deserializeJson(parsed[field]);
      }
    }
    return parsed;
  }
}
