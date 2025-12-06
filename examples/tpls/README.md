# gFlow 工作流模板示例

本目录包含了 gFlow 的关键工作流模板示例，帮助你快速上手和理解工作流的编排方式。

## 🚀 一键运行

每个示例目录都包含 `run.sh` 脚本，支持一键测试运行：

```bash
# 确保服务器正在运行
npm run dev:server

# 运行示例（在对应目录下）
cd examples/tpls/basic
./run.sh                    # 运行默认示例
./run.sh variable           # 运行变量传递示例

# 或使用通用脚本运行任意 YAML
./run-workflow.sh basic/hello-world.yaml
```

### 快速测试

```bash
# 基础示例
cd examples/tpls/basic && ./run.sh

# HTTP API 示例
cd examples/tpls/http-api && ./run.sh

# 控制流程示例
cd examples/tpls/control-flow && ./run.sh

# 数据处理示例
cd examples/tpls/data-processing && ./run.sh

# gRPC 插件示例（需要先启动 Echo 插件）
cd examples/tpls/grpc-plugin && ./run.sh
```

## 📁 目录结构

```
tpls/
├── run-workflow.sh          # 通用运行脚本
├── README.md                # 本文档
│
├── basic/                   # 基础示例
│   ├── run.sh
│   ├── hello-world.yaml     # Hello World
│   └── variable-passing.yaml # 变量传递
│
├── http-api/                # HTTP API 调用
│   ├── run.sh
│   ├── rest-api-call.yaml   # REST API 调用
│   └── webhook-trigger.yaml # Webhook 触发
│
├── control-flow/            # 控制流程
│   ├── run.sh
│   ├── if-condition.yaml    # 条件分支
│   └── loop-foreach.yaml    # 循环遍历
│
├── data-processing/         # 数据处理
│   ├── run.sh
│   └── json-transform.yaml  # JSON 转换
│
├── ai-llm/                  # AI/LLM 集成
│   ├── run.sh
│   ├── chatgpt-simple.yaml  # ChatGPT 对话
│   └── prompt-chaining.yaml # 提示词链
│
├── grpc-plugin/             # gRPC 插件
│   ├── run.sh
│   ├── echo-plugin.yaml     # Echo 插件
│   └── custom-plugin.yaml   # 自定义插件
│
├── scheduled/               # 定时任务
│   ├── run.sh
│   └── cron-job.yaml        # Cron 任务
│
└── media/                   # 媒体处理
    ├── run.sh
    └── audio-capture.yaml   # 音频采集
```

## 📊 示例说明

| 分类 | 示例 | 说明 |
|------|------|------|
| 基础 | hello-world | 最简单的工作流 |
| 基础 | variable-passing | 节点间变量传递 |
| HTTP | rest-api-call | 调用外部 REST API |
| HTTP | webhook-trigger | Webhook 触发的工作流 |
| 控制流 | if-condition | 条件分支示例 |
| 控制流 | loop-foreach | 循环处理数组 |
| 数据 | json-transform | JSON 数据转换 |
| AI | chatgpt-simple | 简单的 LLM 对话 |
| AI | prompt-chaining | 提示词链式调用 |
| 插件 | echo-plugin | gRPC 插件调用 |
| 定时 | cron-job | Cron 定时任务 |
| 媒体 | audio-capture | 音频采集处理 |

## 🔑 表达式语法

gFlow 使用类似 n8n 的表达式语法：

```yaml
# 引用上一个节点的输出
value: "={{ $P.field }}"

# 引用全局变量
value: "={{ $global.apiKey }}"

# JavaScript 表达式
value: "={{ $P.items.length > 0 ? $P.items[0] : 'empty' }}"
```

## 📝 JS 节点最佳实践

在 JS 节点中，通过 `input` 参数传递数据：

```yaml
- name: "ProcessData"
  type: "js"
  parameters:
    # 通过 input 参数传递表达式
    input:
      userData: "={{ $P }}"
      globalConfig: "={{ $global.config }}"
    code: |
      // 从 input 获取数据
      const { userData, globalConfig } = input;
      
      // 处理数据
      return {
        result: userData.name,
        processed: true
      };
```

## 📝 YAML 结构

每个工作流 YAML 包含以下部分：

```yaml
name: "工作流名称"

# 全局变量（可选）
global:
  apiKey: "your-api-key"

# 节点列表
nodes:
  - name: "NodeName"
    type: "node_type"
    parameters:
      key: value
      
# 连接定义
connections:
  SourceNode:
    - - { node: "TargetNode" }
  # 条件分支连接
  IfNode:
    - - { node: "TrueBranch" }   # 第一个分支 (true)
    - - { node: "FalseBranch" }  # 第二个分支 (false)
```
