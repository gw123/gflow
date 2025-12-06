# GFlow前端架构

## 一、概述
GFlow前端是一个基于React的可视化工作流管理界面，提供工作流的创建、编辑、执行和监控功能。前端采用现代化的Web技术栈，支持直观的拖拽式工作流设计和实时的执行监控。

## 二、技术栈
- **框架**: React 19 + TypeScript
- **构建工具**: Vite
- **可视化库**: ReactFlow (工作流图形化编辑)
- **状态管理**: Zustand
- **HTTP客户端**: 原生Fetch API
- **UI组件**: 自定义组件 + Lucide React图标库
- **数据格式**: YAML (工作流定义)

## 三、核心模块

### 1. 应用入口 (`src/App.tsx`)
- 应用的主组件，集成了所有子组件和功能模块
- 管理工作流编辑器的核心状态和交互逻辑
- 协调各个面板、模态框和工具的显示与交互

### 2. 工作流编辑器
- 基于ReactFlow实现的可视化工作流编辑界面
- 支持节点拖拽、连接、删除和编辑
- 提供YAML视图和可视化视图的切换功能
- 实现了节点对齐、自动布局等辅助编辑功能

### 3. 组件系统
- **核心组件**:
  - `EditorPanel`: 工作流编辑器主面板
  - `Sidebar`: 左侧节点库和工具面板
  - `YamlView`: YAML格式工作流定义视图
  - `ExecutionPanel`: 工作流执行监控面板
  - `CustomNode`: 自定义节点渲染组件
  - `HeaderToolbar`: 顶部工具栏
  - `ModalsManager`: 模态框管理组件

- **辅助组件**:
  - `AICopilot`: AI辅助工作流设计组件
  - `ApiManager`: API配置管理组件
  - `AuthModal`: 认证模态框
  - `SecretsManager`: 密钥管理组件
  - `ToolsManager`: 工具管理组件
  - `WorkflowListModal`: 工作流列表模态框

### 4. 状态管理 (`src/stores.ts`)
- 使用Zustand创建多个独立的状态存储：
  - `UIStore`: 管理UI状态，如模态框、面板的显示/隐藏
  - `UserStore`: 用户信息和认证状态
  - `WorkflowStore`: 工作流定义和编辑状态
  - `ExecutionStore`: 工作流执行状态和结果

- 状态存储特点：
  - 轻量级，易于使用
  - 支持订阅和更新通知
  - 支持中间件和持久化

### 5. API客户端 (`src/api/client.ts`)
- 封装与后端API的交互逻辑
- 支持认证、工作流CRUD、执行、密钥管理等操作
- 处理请求/响应格式化和错误处理
- 支持Bearer Token认证机制

### 6. 节点系统
- 定义了多种内置节点类型的前端表示
- 提供节点参数配置表单和验证逻辑
- 支持节点的拖拽和连接操作
- 实现了节点的可视化渲染和状态展示

## 四、工作流执行
- 支持在浏览器中直接执行部分节点类型
- 使用Web Worker进行后台执行，避免阻塞UI
- 提供执行监控、日志查看和断点调试功能
- 支持单步执行和暂停/继续操作

## 五、工作原理
1. **工作流编辑**：用户通过拖拽节点和连接边创建工作流
2. **YAML解析**：将可视化编辑的工作流转换为YAML格式
3. **节点配置**：用户为每个节点配置参数和凭证
4. **工作流执行**：在浏览器或后端执行工作流
5. **结果展示**：实时展示执行状态、日志和结果

## 六、代码结构
```
src/
├── api/           # API客户端
├── components/    # React组件
├── stores.ts      # Zustand状态存储
├── types.ts       # TypeScript类型定义
├── utils.ts       # 工具函数
├── App.tsx        # 应用主组件
└── index.tsx      # React应用入口
```

## 七、开发和构建
```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```
