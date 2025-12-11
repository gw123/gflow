/**
 * PostgreSQL Database Adapter
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { BaseDatabaseAdapter } from './base';
import { glog } from '../../../core/Logger';

export interface PostgresConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;           // 连接池最大连接数
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  connectionString?: string;  // 支持连接字符串
}

export class PostgresAdapter extends BaseDatabaseAdapter {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;  // 用于事务
  private config: PostgresConfig;
  private logger = glog.defaultLogger().named('PostgresAdapter');

  constructor(config: PostgresConfig = {}) {
    super('postgres');
    this.config = {
      host: config.host || process.env.PG_HOST || 'localhost',
      port: config.port || parseInt(process.env.PG_PORT || '5432'),
      database: config.database || process.env.PG_DATABASE || 'workflow',
      user: config.user || process.env.PG_USER || 'postgres',
      password: config.password || process.env.PG_PASSWORD || '',
      ssl: config.ssl ?? (process.env.PG_SSL === 'true'),
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      connectionString: config.connectionString || process.env.DATABASE_URL
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.pool) return;

    try {
      const poolConfig: PoolConfig = this.config.connectionString
        ? { connectionString: this.config.connectionString, ssl: this.config.ssl }
        : {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl,
            max: this.config.max,
            idleTimeoutMillis: this.config.idleTimeoutMillis,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis
          };

      this.pool = new Pool(poolConfig);

      // 测试连接
      const testClient = await this.pool.connect();
      testClient.release();

      this.connected = true;
      this.logger.info(`Connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
    } catch (err: any) {
      this.logger.error(`Connection failed: ${err.message}`);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      this.logger.info('Disconnected');
    }
  }

  async beginTransaction(): Promise<void> {
    this.ensureConnected();
    if (!this.client) {
      this.client = await this.pool!.connect();
      await this.client.query('BEGIN');
    }
  }

  async commit(): Promise<void> {
    if (this.client) {
      await this.client.query('COMMIT');
      this.client.release();
      this.client = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.client) {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.client = null;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureConnected();
    try {
      const executor = this.client || this.pool!;
      const result = await executor.query(sql, params);
      return result.rows as T[];
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
      const executor = this.client || this.pool!;
      const result = await executor.query(sql, params);
      
      // 尝试获取返回的 ID (如果使用 RETURNING id)
      const insertId = result.rows[0]?.id;
      
      return {
        affectedRows: result.rowCount || 0,
        insertId
      };
    } catch (err: any) {
      this.logger.error(`Execute error: ${err.message}`, {
        sql: sql
      });
      throw err;
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStats(): { total: number; idle: number; waiting: number } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  private ensureConnected(): void {
    if (!this.connected || !this.pool) {
      throw new Error('[PostgreSQL] Database not connected');
    }
  }
}
