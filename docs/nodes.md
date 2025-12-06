# GFlow节点系统

## 一、概述
GFlow节点系统是工作流的基本执行单元，每个节点代表一个特定的功能或操作。节点系统采用插件化设计，支持多种节点类型和自定义扩展，为工作流提供了丰富的功能组件。

## 二、节点定义

### 1. 节点结构 (`src/core/types.ts`)
```typescript
export interface NodeDefinition {
  name: string;           // 节点名称
  type: string;           // 节点类型
  desc?: string;          // 节点描述
  parameters?: NodeParameter; // 节点参数
  credentials?: NodeCredentials; // 节点凭证
  credential_id?: string; // 关联的全局凭证ID
  global?: Record<string, any>; // 定义的全局变量
  id?: string;            // 可选的内部ID
  [key: string]: any;     // 允许扩展字段
}
```

### 2. 节点元数据
- **PluginMetadata**: 定义节点的元数据信息
  - `kind`: 节点种类
  - `nodeType`: 节点类型
  - `credentialType`: 凭证类型
  - `parameters`: 参数定义数组

### 3. 参数定义
```typescript
export interface PluginParameterDefinition {
  name: string;           // 参数名称
  type: string;           // 参数类型
  defaultValue?: any;     // 默认值
  description?: string;   // 参数描述
  required?: boolean;     // 是否必填
  options?: string[];     // 选项列表（用于选择输入）
}
```

## 三、节点类型

GFlow支持多种内置节点类型，每种类型对应一个特定的功能：

### 1. HTTP节点
- **功能**: 发送HTTP请求
- **参数**: URL、方法、 headers、 body、 认证信息等
- **输出**: HTTP响应状态、响应体、响应头

### 2. JavaScript节点
- **功能**: 执行JavaScript代码
- **特点**: 在安全的VM沙箱中执行
- **参数**: JavaScript代码、输入变量
- **输出**: 代码执行结果

### 3. 时间节点
- **功能**: 定时器和延时功能
- **类型**: 
  - timer: 基于cron表达式的定时触发
  - delay: 固定时长的延时
- **参数**: cron表达式、延迟时间等

### 4. 控制节点
- **功能**: 工作流控制流
- **类型**: 
  - condition: 条件判断
  - loop: 循环执行
  - parallel: 并行执行
- **参数**: 条件表达式、循环次数、并行分支等

### 5. LLM节点
- **功能**: 与大语言模型交互
- **参数**: API密钥、模型名称、提示词、上下文等
- **输出**: 模型响应结果

### 6. AI图像节点
- **功能**: 生成AI图像
- **参数**: API密钥、模型名称、提示词、图像尺寸等
- **输出**: 生成的图像URL

### 7. TTS节点
- **功能**: 文本转语音
- **参数**: 文本内容、语音模型、语速、语调等
- **输出**: 语音文件URL

### 8. 系统节点
- **功能**: 与系统交互
- **类型**: file、exec等
- **参数**: 文件路径、命令等

### 9. 代理节点
- **功能**: 代理执行其他节点
- **参数**: 代理配置、目标节点等

### 10. 默认节点
- **功能**: 通用节点执行逻辑
- **参数**: 节点配置、执行逻辑等

## 四、节点运行器

### 1. 运行器结构
- **NodeRunner**: 节点运行器接口，定义了节点执行的标准方法
- **每个节点类型对应一个运行器实现**
- **运行器负责具体的节点执行逻辑**

### 2. 运行器实现 (`src/runners/`)
- `AiImageNodeRunnerProxy`: AI图像生成节点运行器
- `ControlNodeRunnerProxy`: 控制节点运行器
- `DefaultRunnerProxy`: 默认节点运行器
- `GrpcNodeRunnerProxy`: gRPC节点运行器
- `HttpNodeRunnerProxy`: HTTP节点运行器
- `InteractionNodeRunnerProxy`: 交互节点运行器
- `JsNodeRunnerProxy`: JavaScript节点运行器
- `LlmNodeRunnerProxy`: LLM节点运行器
- `ManualNodeRunnerProxy`: 手动节点运行器
- `MediaNodeRunnerProxy`: 媒体节点运行器
- `PlayMediaNodeRunnerProxy`: 媒体播放节点运行器
- `SystemNodeRunnerProxy`: 系统节点运行器
- `TimeNodeRunnerProxy`: 时间节点运行器
- `TtsNodeRunnerProxy`: TTS节点运行器

### 3. 运行器上下文
```typescript
export interface NodeRunnerContext {
  workflow: WorkflowDefinition;  // 工作流定义
  executionState: WorkflowExecutionState; // 执行状态
  global: Record<string, any>;   // 全局变量
  inputs: Record<string, any>;   // 输入数据
  waitForInput: (config: any) => Promise<any>; // 等待输入方法
  log: (msg: string) => void;    // 日志记录方法
}
```

## 五、节点执行结果

### 1. 结果结构
```typescript
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface NodeExecutionResult {
  nodeName: string;       // 节点名称
  status: ExecutionStatus; // 执行状态
  startTime: number;      // 开始时间
  endTime?: number;       // 结束时间
  inputs?: any;           // 输入数据
  output?: any;           // 输出数据
  error?: string;         // 错误信息
  logs: string[];         // 执行日志
}
```

### 2. 结果处理
- 节点执行结果存储在工作流执行状态中
- 结果可以作为后续节点的输入
- 支持全局变量的定义和引用

## 六、自定义节点

### 1. 创建自定义节点
- 定义节点类型和元数据
- 实现节点运行器
- 注册节点到节点注册表

### 2. 节点注册
```typescript
// 示例：注册自定义节点
Registry.registerRunner('custom-node', CustomNodeRunner);
```

### 3. 节点扩展
- 支持通过gRPC动态加载节点
- 支持插件化扩展节点类型
- 提供节点开发SDK和文档

## 七、节点系统特点

1. **插件化设计**: 支持动态扩展节点类型
2. **多环境支持**: 节点运行器支持前后端执行
3. **安全执行**: JavaScript节点在VM沙箱中执行
4. **灵活配置**: 支持丰富的参数配置和凭证管理
5. **可扩展性**: 支持自定义节点和运行器
6. **可视化**: 提供节点的可视化配置界面

## 八、代码结构
```
src/
├── core/
│   ├── types.ts       # 核心类型定义，包含节点和工作流结构
├── registry.ts        # 节点注册表
├── runners/           # 节点运行器实现
│   ├── ai-image/      # AI图像节点运行器
│   ├── audioUtils.ts  # 音频处理工具函数
│   ├── base/          # 基础运行器类
│   ├── control/       # 控制节点运行器
│   ├── default/       # 默认节点运行器
│   ├── grpc/          # gRPC节点运行器
│   ├── http/          # HTTP节点运行器
│   ├── index.ts       # 运行器模块入口
│   ├── interaction/   # 交互节点运行器
│   ├── js/            # JavaScript节点运行器
│   ├── llm/           # LLM节点运行器
│   ├── manual/        # 手动节点运行器
│   ├── media/         # 媒体节点运行器
│   ├── play-media/    # 媒体播放节点运行器
│   ├── proxy/         # 代理节点运行器目录（空）
│   ├── system/        # 系统节点运行器
│   ├── time/          # 时间节点运行器
│   ├── tts/           # TTS节点运行器
│   └── utils.ts       # 运行器工具函数
```
