#!/usr/bin/env node

import { Logger } from './src/core/Logger';

// 测试日志功能
const logger = new Logger({
  logFile: './logs/test.log',
  level: 'debug',
  consoleOutput: true,
  fileOutput: true
});

console.log('=== Testing Logger Functionality ===');

// 测试不同级别的日志
logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');

// 测试带详细信息的日志
logger.info('Testing with details', { key: 'value', number: 123, array: [1, 2, 3] });
logger.error('Testing error with details', new Error('Test error'));

console.log('=== Logger Test Complete ===');
console.log('Check logs/test.log for file output');
