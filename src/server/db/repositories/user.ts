/**
 * User Repository - 用户数据访问
 */

import { BaseDatabaseAdapter } from '../adapters/base';
import { User } from '../types';
import { UserRepository as IUserRepository, CreateUserDTO, UpdateUserDTO } from '../interface';
import { BaseRepository } from './base';

export class UserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO> implements IUserRepository {
  constructor(db: BaseDatabaseAdapter) {
    super(db, 'users');
  }

  /**
   * 根据用户名查找
   */
  async findByUsername(tenantId: string, username: string): Promise<User | null> {
    return this.findOneWhere({ tenant_id: tenantId, username });
  }

  /**
   * 根据邮箱查找
   */
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.findOneWhere({ tenant_id: tenantId, email });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET last_login_at = ${this.db.getNowSQL()}
      WHERE id = ${this.db.getPlaceholder(1)}
    `;
    await this.db.execute(sql, [id]);
  }
}
