/**
 * API Response Helpers - 统一响应格式
 */

import { Response } from 'express';
import { ApiResponse, ApiError, ResponseMeta, ErrorCode, ErrorCodes } from './types';

/**
 * 成功响应
 */
export function success<T>(res: Response, data: T, meta?: ResponseMeta, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta
  };
  return res.status(status).json(response);
}

/**
 * 创建成功响应 (201)
 */
export function created<T>(res: Response, data: T): Response {
  return success(res, data, undefined, 201);
}

/**
 * 分页响应
 */
export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  limit: number,
  offset: number
): Response {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return success(res, data, {
    total,
    limit,
    offset,
    page,
    totalPages
  });
}

/**
 * 错误响应
 */
export function error(
  res: Response,
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
  return res.status(status).json(response);
}

/**
 * 预定义错误响应
 */
export const errors = {
  badRequest: (res: Response, message: string, details?: any) =>
    error(res, ErrorCodes.VALIDATION_ERROR, message, 400, details),

  unauthorized: (res: Response, message: string = 'Unauthorized') =>
    error(res, ErrorCodes.UNAUTHORIZED, message, 401),

  forbidden: (res: Response, message: string = 'Forbidden') =>
    error(res, ErrorCodes.FORBIDDEN, message, 403),

  notFound: (res: Response, resource: string = 'Resource') =>
    error(res, ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  conflict: (res: Response, message: string) =>
    error(res, ErrorCodes.CONFLICT, message, 409),

  internal: (res: Response, message: string = 'Internal server error') =>
    error(res, ErrorCodes.INTERNAL_ERROR, message, 500),
};

/**
 * 自定义 API 错误类
 */
export class ApiException extends Error {
  public code: ErrorCode;
  public status: number;
  public details?: any;

  constructor(code: ErrorCode, message: string, status: number = 400, details?: any) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: any) {
    return new ApiException(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiException(ErrorCodes.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiException(ErrorCodes.FORBIDDEN, message, 403);
  }

  static notFound(resource: string = 'Resource') {
    return new ApiException(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
  }

  static conflict(message: string) {
    return new ApiException(ErrorCodes.CONFLICT, message, 409);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiException(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}
