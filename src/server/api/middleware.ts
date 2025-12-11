/**
 * API Middleware - 中间件
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest, AuthUser, AsyncHandler, ErrorCodes } from './types';
import { error, ApiException } from './response';
import { Database } from '../db';
import { glog } from '../../core/Logger';

// ==================== 错误处理中间件 ====================

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  glog.error('[API Error]', err);

  // 处理自定义 API 异常
  if (err instanceof ApiException) {
    return error(res, err.code, err.message, err.status, err.details);
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    return error(res, ErrorCodes.VALIDATION_ERROR, err.message, 400);
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    return error(res, ErrorCodes.VALIDATION_ERROR, 'Invalid JSON', 400);
  }

  // 默认内部错误
  return error(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
}

// ==================== 异步处理包装器 ====================

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
}

// ==================== 认证中间件 ====================

export function createAuthMiddleware(db: Database) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiException.unauthorized('No token provided');
      }

      const token = authHeader.split(' ')[1];
      
      // 解析 token (简化版，生产环境应使用 JWT)
      // Token 格式: mock-token-{timestamp}-{userId}
      const parts = token.split('-');
      if (parts.length < 4 || parts[0] !== 'mock' || parts[1] !== 'token') {
        throw ApiException.unauthorized('Invalid token format');
      }

      const userId = parts[parts.length - 1];
      const user = await db.users.findById(userId);

      if (!user) {
        throw ApiException.unauthorized('User not found');
      }

      // 设置用户信息到请求对象
      req.user = {
        id: user.id,
        tenantId: user.tenant_id,
        username: user.username,
        email: user.email,
        role: user.role as AuthUser['role']
      };
      req.tenantId = user.tenant_id;

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ==================== 可选认证中间件 ====================

export function createOptionalAuthMiddleware(db: Database) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const parts = token.split('-');
        
        if (parts.length >= 4 && parts[0] === 'mock' && parts[1] === 'token') {
          const userId = parts[parts.length - 1];
          const user = await db.users.findById(userId);
          
          if (user) {
            req.user = {
              id: user.id,
              tenantId: user.tenant_id,
              username: user.username,
              email: user.email,
              role: user.role as AuthUser['role']
            };
            req.tenantId = user.tenant_id;
          }
        }
      }
      
      next();
    } catch {
      // 忽略错误，继续处理
      next();
    }
  };
}

// ==================== 角色检查中间件 ====================

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, ErrorCodes.FORBIDDEN, 'Insufficient permissions', 403);
    }

    next();
  };
}

// ==================== 租户检查中间件 ====================

export function requireTenant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return error(res, ErrorCodes.UNAUTHORIZED, 'Tenant context required', 401);
  }
  next();
}

// ==================== 请求日志中间件 ====================

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    if (logLevel === 'error') {
      glog.error(`[${method}] ${originalUrl} ${statusCode} ${duration}ms`);
    } else if (logLevel === 'warn') {
      glog.warn(`[${method}] ${originalUrl} ${statusCode} ${duration}ms`);
    } else {
      glog.info(`[${method}] ${originalUrl} ${statusCode} ${duration}ms`);
    }
  });

  next();
}

// ==================== 请求限流中间件 (简化版) ====================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requestCounts.set(key, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return error(res, ErrorCodes.VALIDATION_ERROR, 'Too many requests', 429);
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    next();
  };
}

// ==================== CORS 配置 ====================

export const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400
};
