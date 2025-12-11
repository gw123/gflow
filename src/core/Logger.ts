import fs from 'fs';
import path from 'path';

// 环境检测（浏览器/Node）
const isNode = typeof process !== 'undefined' && !!(process as any).versions && !!(process as any).versions.node;
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Logger Utility - 日志工具类
 * 支持同时输出到控制台和文件
 * 兼容 glog-nodejs API
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'dpanic' | 'panic' | 'fatal';

interface LoggerOptions {
  /** 日志文件路径 */
  logFile?: string;
  /** 日志级别 */
  level?: LogLevel;
  /** 是否输出到控制台 */
  consoleOutput?: boolean;
  /** 是否输出到文件 */
  fileOutput?: boolean;
  /** 日志名称 */
  name?: string;
  /** 日志字段 */
  fields?: Record<string, any>;
  /** 错误信息 */
  errorContext?: Error;
}

interface Context {
  logger: EnhancedLogger;
  fields: Record<string, any>;
}

// 上下文存储（简化实现）
let context: Context | undefined;

export class EnhancedLogger {
  private logFile: string;
  private level: LogLevel;
  private consoleOutput: boolean;
  private fileOutput: boolean;
  private name?: string;
  private fields: Record<string, any> = {};
  private errorContext?: Error;

  constructor(options: LoggerOptions = {}) {
    // 默认配置
    // 在浏览器环境下不要调用 process.cwd，也默认不写文件
    this.logFile = options.logFile || (isNode ? path.join(process.cwd(), 'logs', 'gflow.log') : 'gflow.log');
    this.level = options.level || 'info';
    this.consoleOutput = options.consoleOutput !== false;
    // 浏览器默认不进行文件输出；Node 默认开启文件输出（除非显式关闭）
    this.fileOutput = options.fileOutput !== undefined ? options.fileOutput : isNode;
    this.name = options.name;
    this.fields = options.fields || {};
    this.errorContext = options.errorContext;

    // 确保日志目录存在
    if (this.fileOutput && isNode) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * 获取当前时间戳
   */
  private getTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  }

  /**
   * 获取日志前缀
   */
  private getPrefix(level: LogLevel): string {
    const timestamp = this.getTimestamp();
    let prefix = `[${timestamp}] [${level}]`;
    
    // 添加名称
    if (this.name) {
      prefix += ` [${this.name}]`;
    }
    
    // 添加字段
    const fieldKeys = Object.keys(this.fields);
    if (fieldKeys.length > 0) {
      fieldKeys.forEach(key => {
        prefix += ` [${key}]`;
      });
    }
    
    return prefix;
  }

  /**
   * 检查日志级别是否应该被记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'dpanic', 'panic', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  /**
   * 写入日志到文件
   */
  private writeToFile(message: string): void {
    // 仅在 Node 环境写文件，浏览器环境直接忽略
    if (!this.fileOutput || !isNode) return;

    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (err) {
      // 使用直接console输出以避免循环依赖
      console.error(`[Logger Error] Failed to write to log file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    // 格式化消息
    let formattedMessage = message;
    if (args.length > 0) {
      formattedMessage = this.formatMessage(message, args);
    }

    // 添加错误信息
    if (this.errorContext) {
      formattedMessage += `\nError: ${this.errorContext.message}\nStack: ${this.errorContext.stack}`;
    }

    // 构建完整日志消息
    const prefix = this.getPrefix(level);
    const fullMessage = `${prefix} ${formattedMessage}`;

    // 写入文件
    this.writeToFile(fullMessage);

    // 输出到控制台
    if (this.consoleOutput) {
      switch (level) {
        case 'debug':
          console.debug(fullMessage);
          break;
        case 'info':
          console.info(fullMessage);
          break;
        case 'warn':
          console.warn(fullMessage);
          break;
        case 'error':
        case 'dpanic':
        case 'panic':
        case 'fatal':
          console.error(fullMessage);
          break;
      }

      // panic 和 fatal 级别处理
      if (level === 'panic') {
        throw new Error(formattedMessage);
      } else if (level === 'fatal') {
        console.error(formattedMessage);
        // 仅在 Node 环境尝试退出进程；浏览器抛出错误即可
        if (isNode && typeof (process as any).exit === 'function') {
          (process as any).exit(1);
        } else {
          throw new Error(formattedMessage);
        }
      }
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(format: string, args: any[]): string {
    let result = format;
    let index = 0;
    
    // 简单的格式化实现，支持 %s, %d
    result = result.replace(/%[sd]/g, (match) => {
      const arg = args[index++];
      if (match === '%s') {
        return String(arg);
      } else if (match === '%d') {
        return Number(arg).toString();
      }
      return match;
    });
    
    return result;
  }

  /**
   * 记录调试日志
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * 记录信息日志
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * 记录错误日志
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * 记录开发环境 panic 日志
   */
  dpanic(message: string, ...args: any[]): void {
    this.log('dpanic', message, ...args);
  }

  /**
   * 记录 panic 日志并抛出异常
   */
  panic(message: string, ...args: any[]): void {
    this.log('panic', message, ...args);
  }

  /**
   * 记录 fatal 日志并退出程序
   */
  fatal(message: string, ...args: any[]): void {
    this.log('fatal', message, ...args);
  }

  // 格式化日志方法
  debugf(format: string, ...args: any[]): void {
    this.debug(format, ...args);
  }

  infof(format: string, ...args: any[]): void {
    this.info(format, ...args);
  }

  warnf(format: string, ...args: any[]): void {
    this.warn(format, ...args);
  }

  errorf(format: string, ...args: any[]): void {
    this.error(format, ...args);
  }

  dpanicf(format: string, ...args: any[]): void {
    this.dpanic(format, ...args);
  }

  panicf(format: string, ...args: any[]): void {
    this.panic(format, ...args);
  }

  fatalf(format: string, ...args: any[]): void {
    this.fatal(format, ...args);
  }

  /**
   * 添加字段
   */
  withField(key: string, value: any): EnhancedLogger {
    return new EnhancedLogger({
      logFile: this.logFile,
      level: this.level,
      consoleOutput: this.consoleOutput,
      fileOutput: this.fileOutput,
      name: this.name,
      fields: { ...this.fields, [key]: value },
      errorContext: this.errorContext,
    });
  }

  /**
   * 添加多个字段
   */
  withFields(fields: Record<string, any>): EnhancedLogger {
    return new EnhancedLogger({
      logFile: this.logFile,
      level: this.level,
      consoleOutput: this.consoleOutput,
      fileOutput: this.fileOutput,
      name: this.name,
      fields: { ...this.fields, ...fields },
      errorContext: this.errorContext,
    });
  }

  /**
   * 添加错误信息
   */
  withError(err: Error): EnhancedLogger {
    return new EnhancedLogger({
      logFile: this.logFile,
      level: this.level,
      consoleOutput: this.consoleOutput,
      fileOutput: this.fileOutput,
      name: this.name,
      fields: { ...this.fields },
      errorContext: err,
    });
  }

  /**
   * 设置日志名称
   */
  named(name: string): EnhancedLogger {
    return new EnhancedLogger({
      logFile: this.logFile,
      level: this.level,
      consoleOutput: this.consoleOutput,
      fileOutput: this.fileOutput,
      name,
      fields: { ...this.fields },
      errorContext: this.errorContext,
    });
  }

  /**
   * 获取日志文件路径
   */
  getLogFile(): string {
    return this.logFile;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// glog 兼容 API 实现
const defaultLoggerInstance = new EnhancedLogger();

export const glog = {
  // 基础日志方法
  debug: (message: string, ...args: any[]) => defaultLoggerInstance.debug(message, ...args),
  info: (message: string, ...args: any[]) => defaultLoggerInstance.info(message, ...args),
  warn: (message: string, ...args: any[]) => defaultLoggerInstance.warn(message, ...args),
  error: (message: string, ...args: any[]) => defaultLoggerInstance.error(message, ...args),
  dpanic: (message: string, ...args: any[]) => defaultLoggerInstance.dpanic(message, ...args),
  panic: (message: string, ...args: any[]) => defaultLoggerInstance.panic(message, ...args),
  fatal: (message: string, ...args: any[]) => defaultLoggerInstance.fatal(message, ...args),

  // 格式化日志方法
  debugf: (format: string, ...args: any[]) => defaultLoggerInstance.debugf(format, ...args),
  infof: (format: string, ...args: any[]) => defaultLoggerInstance.infof(format, ...args),
  warnf: (format: string, ...args: any[]) => defaultLoggerInstance.warnf(format, ...args),
  errorf: (format: string, ...args: any[]) => defaultLoggerInstance.errorf(format, ...args),
  dpanicf: (format: string, ...args: any[]) => defaultLoggerInstance.dpanicf(format, ...args),
  panicf: (format: string, ...args: any[]) => defaultLoggerInstance.panicf(format, ...args),
  fatalf: (format: string, ...args: any[]) => defaultLoggerInstance.fatalf(format, ...args),

  // 日志器方法
  defaultLogger: () => defaultLoggerInstance,
  withField: (key: string, value: any) => defaultLoggerInstance.withField(key, value),
  withFields: (fields: Record<string, any>) => defaultLoggerInstance.withFields(fields),
  withError: (err: Error) => defaultLoggerInstance.withError(err),

  // 上下文日志方法
  toContext: (logger: EnhancedLogger) => {
    context = {
      logger,
      fields: {},
    };
    return logger;
  },

  addField: (key: string, value: any) => {
    if (context) {
      context.fields[key] = value;
    }
  },

  addFields: (fields: Record<string, any>) => {
    if (context) {
      context.fields = { ...context.fields, ...fields };
    }
  },

  addTopField: (key: string, value: any) => {
    if (context) {
      context.fields[key] = value;
    }
  },

  addTraceId: (traceId: string) => {
    if (context) {
      context.fields[traceId] = '';
    }
  },

  addUserId: (userId: number) => {
    if (context) {
      context.fields[`user_${userId}`] = '';
    }
  },

  addPathname: (pathname: string) => {
    if (context) {
      context.fields[pathname] = '';
    }
  },

  extractEntry: () => {
    if (context) {
      return context.logger.withFields(context.fields);
    }
    return defaultLoggerInstance;
  },

  extractTraceId: () => {
    if (context) {
      const traceId = Object.keys(context.fields).find(key => key.match(/^[0-9a-f]{32}$/));
      return traceId || '';
    }
    return '';
  },

  extractUserId: () => {
    if (context) {
      const userIdKey = Object.keys(context.fields).find(key => key.startsWith('user_'));
      if (userIdKey) {
        return Number(userIdKey.replace('user_', ''));
      }
    }
    return 0;
  },

  extractPathname: () => {
    if (context) {
      const pathname = Object.keys(context.fields).find(key => key.startsWith('/'));
      return pathname || '';
    }
    return '';
  },

  // 配置方法
  setDefaultLoggerConfig: (options: LoggerOptions) => {
    // 简化实现，仅更新默认日志器的级别
    if (options.level) {
      defaultLoggerInstance.setLevel(options.level);
    }
  },
};

// 导出兼容原有代码的 logger
const loggerInstance = new EnhancedLogger();
export const logger = {
  debug: (message: string, details?: any) => loggerInstance.debug(message, details),
  info: (message: string, details?: any) => loggerInstance.info(message, details),
  warn: (message: string, details?: any) => loggerInstance.warn(message, details),
  error: (message: string, details?: any) => loggerInstance.error(message, details),
  log: (level: LogLevel, message: string, details?: any) => loggerInstance.log(level, message, details),
  setLevel: (level: LogLevel) => loggerInstance.setLevel(level),
  getLogFile: () => loggerInstance.getLogFile(),
};

// 导出 Level 枚举
export enum Level {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DPANIC = 'dpanic',
  PANIC = 'panic',
  FATAL = 'fatal',
}

// 导出 Options 类
export class Options {
  private config: any = {};

  constructor(config: any = {}) {
    this.config = config;
  }

  withStdoutOutputPath() {
    this.config.consoleOutput = true;
    return this;
  }

  withOutputPath(path: string) {
    this.config.logFile = path;
    this.config.fileOutput = true;
    return this;
  }

  withJsonEncoding() {
    // 简化实现，不支持 JSON 编码
    return this;
  }
};

// 重导出 EnhancedLogger 以支持原有代码
export { EnhancedLogger as Logger };
