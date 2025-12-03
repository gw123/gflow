/**
 * API Types - API 类型定义
 */

import { Request, Response, NextFunction } from 'express';

// ==================== 响应类型 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  total?: number;
  limit?: number;
  offset?: number;
  page?: number;
  totalPages?: number;
}

// ==================== 请求扩展 ====================

export interface AuthUser {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  tenantId?: string;
}

// ==================== 错误码 ====================

export const ErrorCodes = {
  // 通用错误 (1xxx)
  INTERNAL_ERROR: 'E1000',
  VALIDATION_ERROR: 'E1001',
  NOT_FOUND: 'E1002',
  CONFLICT: 'E1003',
  
  // 认证错误 (2xxx)
  UNAUTHORIZED: 'E2000',
  INVALID_TOKEN: 'E2001',
  TOKEN_EXPIRED: 'E2002',
  FORBIDDEN: 'E2003',
  
  // 业务错误 (3xxx)
  WORKFLOW_NOT_FOUND: 'E3001',
  WORKFLOW_EXECUTION_FAILED: 'E3002',
  SECRET_NOT_FOUND: 'E3003',
  USER_EXISTS: 'E3004',
  INVALID_CREDENTIALS: 'E3005',
  AGENT_NOT_FOUND: 'E3006',
  FILE_NOT_FOUND: 'E3007',
  FORM_NOT_FOUND: 'E3008',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ==================== 控制器类型 ====================

export type AsyncHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<any>;

// ==================== 分页参数 ====================

export interface PaginationParams {
  limit: number;
  offset: number;
  page: number;
}

export function parsePagination(query: any): PaginationParams {
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}
