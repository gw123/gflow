# GFlow后端架构

## 一、概述
GFlow后端是一个基于Node.js和Express.js的工作流管理服务，负责工作流的执行、调度、数据持久化和API服务。后端提供了强大的工作流引擎和节点运行器，支持多种节点类型的执行和复杂的工作流控制逻辑。

## 二、技术栈
- **框架**: Express.js
- **运行环境**: Node.js
- **调度系统**: node-cron
- **数据存储**: JSON文件（开发/演示环境）
- **安全**: VM沙箱（用于执行JavaScript节点）
- **HTTP客户端**: axios
- **文件操作**: fs-extra

## 三、核心模块

### 1. 服务器入口 (`src/server/index.ts`)
- 初始化Express应用和中间件
- 配置CORS、路由和API端点
- 启动定时任务调度系统
- 处理工作流的CRUD操作

### 2. 工作流引擎 (`src/core/WorkflowEngine.ts`, `src/server/engine.ts`)
- **CoreEngine**: 通用工作流引擎，处理图遍历、状态管理和控制流
- **ServerWorkflowEngine**: 服务器端工作流引擎，包装CoreEngine并提供服务器特定上下文
- 支持BFS图遍历、节点执行协调和状态管理

### 3. 调度系统
- 基于cron表达式的定时工作流触发
- 自动加载和调度包含定时器节点的工作流
- 支持动态添加/移除定时任务
- 提供定时任务的状态监控和日志记录

### 4. API服务
- 提供RESTful API接口，支持：
  - 工作流CRUD操作
  - 工作流执行和监控
  - 认证和用户管理
  - 密钥管理
  - API代理服务

- **主要API端点**:
  - `/api/execute`: 执行工作流
  - `/api/proxy`: HTTP代理服务
  - `/api/auth/*`: 认证相关API
  - `/api/workflows/*`: 工作流管理API
  - `/api/secrets/*`: 密钥管理API
  - `/api/apis/*`: API配置管理API

### 5. 节点运行器 (`src/runners/`)
- 实现了多种服务器端节点运行器：
  - HTTP节点：发送HTTP请求
  - JavaScript节点：在VM沙箱中执行JS代码
  - 时间节点：定时器和延时功能
  - 控制节点：条件判断、循环等控制流
  - 默认节点：通用节点执行逻辑

### 6. 数据存储
- 使用JSON文件进行数据持久化（开发/演示环境）
- 支持的存储实体：
  - 工作流定义
  - 用户信息
  - 密钥凭证
  - API配置

- 数据文件位置：
  - 工作流: `src/server/data/workflows.json`
  - 密钥: `src/server/data/secrets.json`
  - 用户: `src/server/data/users.json`
  - API配置: `src/server/data/apis.json`

## 四、工作流执行流程
1. **接收执行请求**：通过API或定时调度接收工作流执行请求
2. **加载工作流**：从存储或请求中加载工作流定义
3. **初始化引擎**：创建工作流引擎实例并初始化执行状态
4. **识别起始节点**：找到类型为manual、webhook或timer的起始节点
5. **执行节点**：
   - 获取节点对应的运行器
   - 准备执行上下文
   - 执行节点逻辑
   - 收集执行结果和日志
6. **处理连接**：
   - 评估连接条件
   - 确定下一个执行节点
7. **重复执行**：直到所有可执行节点都执行完成或遇到错误

## 五、安全机制
1. **VM沙箱**：JavaScript节点在隔离的VM环境中执行，限制对系统资源的访问
2. **认证授权**：支持用户认证和基于Token的授权机制
3. **密钥管理**：密钥凭证安全存储，通过ID引用，避免明文暴露
4. **输入验证**：对所有API请求进行输入验证，防止恶意输入
5. **CORS配置**：支持跨域请求配置，限制允许的来源

## 六、代码结构
```
src/server/
├── api/           # API相关模块
├── data/          # 数据存储
├── db/            # 数据库相关
├── app.ts         # Express应用配置
├── engine.ts      # 服务器端工作流引擎
├── index.ts       # 服务器入口
└── scheduler.ts   # 定时调度系统
```

## 七、开发和部署
```bash
# 开发模式
npm run dev:server

# 生产构建
npm run build

# 启动服务器
npm run server
```
