/**
 * Server Entry Point - 服务器入口
 * 
 * 使用新的数据库模块和 API 架构
 */

import { createDatabaseFromEnv, Database } from './db';
import { createApp } from './app';
import { WorkflowScheduler } from './scheduler';
import { glog } from '../core/Logger';

// ==================== 配置 ====================

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

// ==================== 全局变量 ====================

let db: Database;
let scheduler: WorkflowScheduler;

// ==================== 启动服务器 ====================

async function bootstrap() {
  glog.info('🚀 Starting server...');

  try {
    // 1. 连接数据库
    glog.info('📦 Connecting to database...');
    db = await createDatabaseFromEnv();
    
    // 2. 执行数据库迁移
    glog.info('🔄 Running migrations...');
    await db.migrate();

    // 3. 创建 Express 应用
    glog.info('⚙️  Creating application...');
    const app = createApp({
      db,
      enableRateLimit: process.env.NODE_ENV === 'production',
      enableRequestLogger: true
    });

    // 4. 启动调度器
    glog.info('⏰ Starting scheduler...');
    scheduler = new WorkflowScheduler(db);
    await scheduler.start();

    // 5. 启动 HTTP 服务器
    const server = app.listen(PORT, HOST, () => {
      glog.info(`\n✅ Server running on http://${HOST}:${PORT}`);
      glog.info(`📚 API Documentation: http://${HOST}:${PORT}/api/health`);
      glog.info(`\n📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      glog.info(`💾 Database: ${process.env.DB_TYPE || 'sqlite'}`);
    });

    // 6. 优雅关闭
    setupGracefulShutdown(server);

  } catch (err) {
    glog.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// ==================== 优雅关闭 ====================

function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    glog.info(`\n📴 Received ${signal}, shutting down gracefully...`);

    // 停止接受新连接
    server.close(async () => {
      glog.info('🔌 HTTP server closed');

      // 停止调度器
      if (scheduler) {
        scheduler.stop();
        glog.info('⏰ Scheduler stopped');
      }

      // 关闭数据库连接
      if (db) {
        await db.close();
        glog.info('💾 Database connection closed');
      }

      glog.info('👋 Goodbye!');
      process.exit(0);
    });

    // 强制关闭超时
    setTimeout(() => {
      glog.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ==================== 启动 ====================

bootstrap();
