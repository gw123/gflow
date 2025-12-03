/**
 * API Validators - 请求验证
 */

import { Request, Response, NextFunction } from 'express';
import { ApiException } from './response';

// ==================== 验证器类型 ====================

type ValidationRule = {
  field: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
};

type ValidationSchema = ValidationRule[];

// ==================== 验证函数 ====================

function validateField(value: any, rule: ValidationRule): string | null {
  const { field, type, required, minLength, maxLength, min, max, pattern, custom } = rule;

  // 必填检查
  if (required && (value === undefined || value === null || value === '')) {
    return `${field} is required`;
  }

  // 如果值为空且非必填，跳过其他验证
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // 类型检查
  if (type) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return `${field} must be a string`;
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return `${field} must be a number`;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return `${field} must be a boolean`;
        break;
      case 'array':
        if (!Array.isArray(value)) return `${field} must be an array`;
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) return `${field} must be an object`;
        break;
      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `${field} must be a valid email`;
        }
        break;
    }
  }

  // 字符串长度检查
  if (typeof value === 'string') {
    if (minLength !== undefined && value.length < minLength) {
      return `${field} must be at least ${minLength} characters`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${field} must be at most ${maxLength} characters`;
    }
  }

  // 数字范围检查
  if (typeof value === 'number') {
    if (min !== undefined && value < min) return `${field} must be at least ${min}`;
    if (max !== undefined && value > max) return `${field} must be at most ${max}`;
  }

  // 正则检查
  if (pattern && typeof value === 'string' && !pattern.test(value)) {
    return `${field} format is invalid`;
  }

  // 自定义验证
  if (custom) {
    const result = custom(value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${field} is invalid`;
    }
  }

  return null;
}

// ==================== 验证中间件工厂 ====================

export function validate(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[source];
    const errors: string[] = [];

    for (const rule of schema) {
      const value = data[rule.field];
      const error = validateField(value, rule);
      if (error) errors.push(error);
    }

    if (errors.length > 0) {
      throw ApiException.badRequest('Validation failed', errors);
    }

    next();
  };
}

// ==================== 预定义验证 Schema ====================

export const schemas = {
  // 认证
  register: [
    { field: 'username', type: 'string', required: true, minLength: 3, maxLength: 50 },
    { field: 'email', type: 'email', required: true },
    { field: 'password', type: 'string', required: true, minLength: 6 },
  ] as ValidationSchema,

  login: [
    { field: 'username', type: 'string', required: true },
    { field: 'password', type: 'string', required: true },
  ] as ValidationSchema,

  // 工作流
  createWorkflow: [
    { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 255 },
    { field: 'content', type: 'object', required: true },
  ] as ValidationSchema,

  updateWorkflow: [
    { field: 'name', type: 'string', minLength: 1, maxLength: 255 },
    { field: 'content', type: 'object' },
    { field: 'status', type: 'string' },
  ] as ValidationSchema,

  // 密钥
  createSecret: [
    { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 255 },
    { field: 'type', type: 'string', required: true },
    { field: 'data', type: 'object', required: true },
  ] as ValidationSchema,

  // API
  createApi: [
    { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 255 },
    { field: 'method', type: 'string', required: true },
    { field: 'path', type: 'string', required: true },
  ] as ValidationSchema,

  // Agent
  createAgent: [
    { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 255 },
    { field: 'model', type: 'string', required: true },
  ] as ValidationSchema,

  // 表单
  createForm: [
    { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 255 },
    { field: 'schema', type: 'object', required: true },
  ] as ValidationSchema,

  // ID 参数
  idParam: [
    { field: 'id', type: 'string', required: true },
  ] as ValidationSchema,

  // 分页参数
  pagination: [
    { field: 'limit', type: 'number', min: 1, max: 100 },
    { field: 'page', type: 'number', min: 1 },
  ] as ValidationSchema,
};
