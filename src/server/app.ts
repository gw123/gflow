/**
 * Express Application - 应用配置
 */

import express, { Express } from 'express';
import cors from 'cors';
import { Database } from './db';
import { createRoutes, errorHandler, requestLogger, rateLimit, corsOptions } from './api';

export interface AppConfig {
  db: Database;
  enableRateLimit?: boolean;
  enableRequestLogger?: boolean;
}

export function createApp(config: AppConfig): Express {
  const app = express();

  // ==================== 基础中间件 ====================
  
  // CORS
  app.use(cors(corsOptions));
  
  // JSON 解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 请求日志
  if (config.enableRequestLogger !== false) {
    app.use(requestLogger);
  }

  // 限流
  if (config.enableRateLimit !== false) {
    app.use('/api', rateLimit(100, 60000)); // 100 requests per minute
  }

  // ==================== API 路由 ====================
  
  const apiRoutes = createRoutes(config.db);
  app.use('/api', apiRoutes);

  // ==================== 错误处理 ====================
  
  app.use(errorHandler);

  // ==================== 404 处理 ====================
  
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'E1002',
        message: 'Not found'
      }
    });
  });

  return app;
}
