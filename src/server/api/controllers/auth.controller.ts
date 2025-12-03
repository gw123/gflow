/**
 * Auth Controller - 认证控制器
 */

import { Response } from 'express';
import { AuthRequest } from '../types';
import { success, ApiException } from '../response';
import { Database } from '../../db';
import { hashPassword, verifyPassword, generateToken } from '../../db/utils';

export class AuthController {
  constructor(private db: Database) {}

  /**
   * 用户注册
   */
  register = async (req: AuthRequest, res: Response) => {
    const { username, email, password, tenantId } = req.body;

    // 检查租户是否存在
    let tenant = tenantId ? await this.db.tenants.findById(tenantId) : null;
    
    // 如果没有指定租户，创建默认租户
    if (!tenant) {
      const existingTenant = await this.db.tenants.findBySlug('default');
      if (existingTenant) {
        tenant = existingTenant;
      } else {
        tenant = await this.db.tenants.create({
          name: 'Default Tenant',
          slug: 'default',
          plan: 'free'
        });
      }
    }

    // 检查用户名是否已存在
    const existingUser = await this.db.users.findByUsername(tenant.id, username);
    if (existingUser) {
      throw ApiException.conflict('Username already exists');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.db.users.findByEmail(tenant.id, email);
    if (existingEmail) {
      throw ApiException.conflict('Email already exists');
    }

    // 创建用户
    const passwordHash = hashPassword(password);
    const user = await this.db.users.create({
      tenant_id: tenant.id,
      username,
      email,
      password_hash: passwordHash,
      role: 'editor'
    });

    // 返回用户信息 (不包含密码)
    const { password_hash: _, ...userWithoutPassword } = user;
    return success(res, userWithoutPassword, undefined, 201);
  };

  /**
   * 用户登录
   */
  login = async (req: AuthRequest, res: Response) => {
    const { username, password, tenantSlug } = req.body;

    // 查找租户
    const tenant = tenantSlug 
      ? await this.db.tenants.findBySlug(tenantSlug)
      : await this.db.tenants.findBySlug('default');

    if (!tenant) {
      throw ApiException.unauthorized('Invalid credentials');
    }

    // 查找用户
    const user = await this.db.users.findByUsername(tenant.id, username);
    if (!user) {
      throw ApiException.unauthorized('Invalid credentials');
    }

    // 验证密码
    if (!verifyPassword(password, user.password_hash)) {
      throw ApiException.unauthorized('Invalid credentials');
    }

    // 更新最后登录时间
    await this.db.users.updateLastLogin(user.id);

    // 生成 token (简化版，生产环境应使用 JWT)
    const token = `mock-token-${Date.now()}-${user.id}`;

    // 返回用户信息和 token
    const { password_hash: _, ...userWithoutPassword } = user;
    return success(res, {
      user: userWithoutPassword,
      token,
      expiresIn: 86400 // 24 hours
    });
  };

  /**
   * 获取当前用户信息
   */
  me = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw ApiException.unauthorized();
    }

    const user = await this.db.users.findById(req.user.id);
    if (!user) {
      throw ApiException.unauthorized('User not found');
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    return success(res, userWithoutPassword);
  };

  /**
   * 更新当前用户信息
   */
  updateProfile = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw ApiException.unauthorized();
    }

    const { email, avatar_url, settings } = req.body;
    
    const updated = await this.db.users.update(req.user.id, {
      email,
      avatar_url,
      settings
    });

    if (!updated) {
      throw ApiException.notFound('User');
    }

    const { password_hash: _, ...userWithoutPassword } = updated;
    return success(res, userWithoutPassword);
  };

  /**
   * 修改密码
   */
  changePassword = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw ApiException.unauthorized();
    }

    const { currentPassword, newPassword } = req.body;

    const user = await this.db.users.findById(req.user.id);
    if (!user) {
      throw ApiException.unauthorized('User not found');
    }

    // 验证当前密码
    if (!verifyPassword(currentPassword, user.password_hash)) {
      throw ApiException.badRequest('Current password is incorrect');
    }

    // 更新密码
    const newPasswordHash = hashPassword(newPassword);
    await this.db.users.update(req.user.id, {
      password_hash: newPasswordHash
    });

    return success(res, { message: 'Password changed successfully' });
  };
}
