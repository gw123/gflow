# 触发器执行流总览

本章系统梳理 GFlow 中触发器（Triggers）的工作机制，涵盖内置触发器（`manual`、`webhook`、`timer`）与 gRPC 插件触发器（例如 `timer_trigger`），以及它们如何被调度、如何将事件上下文注入到工作流、节点如何获取这些数据并完成执行。

## 总体流程
- 工作流的起始节点（Start Nodes）由引擎识别，包括：`manual`、`webhook`、`timer` 等。
- 当触发事件到达时，引擎会将触发上下文注入到工作流的全局变量中：`$global.TRIGGER`。
- 节点参数通过统一的插值引擎处理（`utils.interpolate`），可以访问：`$P`（当前节点输入）、`$global`（全局）、`$inputs`（所有输入）、`$node`（前序节点输出）。
- 引擎按工作流编排顺序执行节点，节点运行器（Node Runners）会读取插值后的参数，并返回结构化输出供后续节点使用。

## 全局触发上下文（$global.TRIGGER）
当引擎处理触发事件时，会向工作流的全局变量注入如下结构：
- `kind`：触发类型（如 `webhook`、`manual`、`timer_trigger` 等）
- `source`：事件源（例如 gRPC 插件名 `timer_trigger`）
- `trace_id`：可选，链路追踪标识（存在于某些上下文中）
- `event_id`：事件唯一标识
- `payload`：事件载荷（结构取决于具体触发器或插件）

示例表达式：
- 读取插件触发器消息：`{{ $global.TRIGGER.payload.message }}`
- 读取 Webhook 查询参数（内置示例）：`{{ $Webhook.query.id }}`

## 内置触发器
### manual
- 手动触发的起始节点，用于开发、测试或显式启动工作流。
- 运行器：`src/runners/manual/ManualNodeRunner.ts`
- 输出包含：`triggeredAt` 以及节点参数。

### webhook
- 作为起始节点，在服务端接收到外部 HTTP 请求时启动工作流（客户端可模拟）。
- 运行器：
  - 客户端模拟：`src/runners/http/HttpNodeRunner.ts`、`HttpNodeRunnerBrowser.ts`
  - 服务端真实执行：`src/runners/http/HttpNodeRunnerServer.ts`
- 服务端输出示例：
  - `triggered: true`
  - `type: 'webhook'`
  - `timestamp`（毫秒）
- 在 UI 示例中可通过 `{{ $Webhook.query.id }}` 访问查询参数（参见 `HelpModal.tsx`）。

### timer（内置调度）
- 作为起始节点，由调度器按 `cron` 或固定间隔执行工作流。
- 调度器：`src/server/scheduler.ts`
  - 扫描工作流中的 `timer` 节点。
  - 解析 `cron` 表达式或将 `secondsInterval` 转换为 `cron`。
  - 使用 `node-cron` 定时触发并通过 `ServerWorkflowEngine` 执行工作流。
- 运行器：`src/runners/time/TimeNodeRunner.ts`
  - 将定时触发参数传递给下游节点。
  - 输出包含：`triggeredAt`（触发时刻）。
  - 也实现 `wait` 节点以在工作流中进行延时控制。

## gRPC 插件触发器
### 插件示例：timer_trigger（Go）
- 插件位置：`plugins/timer_trigger/main.go`
- 元数据：
  - `Name`: `timer_trigger`
  - `Category`: Trigger（`pb.NodeCategory_CATEGORY_TRIGGER`）
  - 描述：按 `filters.interval_ms` 周期推送触发事件。
- 事件订阅：`SubscribeTrigger` 支持 filters：
  - `interval_ms`：间隔毫秒数（默认 `10000`）
  - `count`：推送次数（默认 `0` 表示无限）
- 每次触发推送的事件载荷（`payload`）结构：
  - `message`: 例如 `tick #<emitted>`
  - `now_ms`: 触发时间戳（毫秒）
  - `interval_ms`: 当前订阅的周期毫秒数
- 事件（`TriggerEvent`）的其他字段：
  - `event_id`: 例如 `timer-<unix_nano>-<emitted>`
  - `source`: 固定为 `timer_trigger`
  - `timestamp_ms`: 与 `now_ms` 一致

### 订阅与事件处理
- 插件管理器：`src/runners/grpc/GrpcPluginManager.ts`
  - 订阅触发器的判定：
    - 插件注册完成后，若节点分类为 Trigger（`category === 'trigger'`）且 `shouldSubscribeForTrigger(kind)` 为真，则启动订阅。
    - `shouldSubscribeForTrigger(kind)` 会扫描工作流文件，查找 `n.type === kind` 的节点（触发器节点）。
  - 启动订阅（`startTriggerSubscription(kind)`）：
    - 若已有同名订阅流，先尝试 `cancel()` 并删除旧流，避免重复。
    - 组装订阅请求：`{ consumer_group, filters }`，值来自 `plugins.yaml` 的插件配置。
    - 调用 `client.SubscribeTrigger(request)` 并保存返回的流到内部映射。
    - 监听事件：
      - `data`：收到事件后重置重试状态（避免进入退避），然后调用 `handleTriggerEvent(kind, event)` 进行处理。
      - `error`：记录错误并调用 `scheduleTriggerResubscribe(kind, reason, true)` 按指数退避策略调度重订阅（带抖动）。
      - `end`：如果当前不在退避周期，且仍有工作流引用该触发器，则按初始延迟重订阅；否则跳过。
  - 工作流变更监听：
    - `startWorkflowsWatcher()` 监听 `server/data/workflows.json` 文件变化。
    - 变化后触发 `restartAllTriggerSubscriptions()`：
      - 若某 `kind` 被工作流引用且尚未订阅，则启动订阅；
      - 若不再被引用且存在订阅，则取消订阅并清理重试状态。
  - 取消与卸载：
    - `unregisterPlugin(kind)` 会关闭客户端、取消并移除订阅流，并清理该 `kind` 的重试状态。

- 事件处理：`handleTriggerEvent`
  - 将 gRPC `Value` 转为 JS 对象（`convertValue`），提取 `payload`。
  - 读取事件元信息：`source`、`trace_id`（可选）、`event_id`。
  - 遍历所有工作流，筛选包含 `type === kind` 的节点（触发器节点）。
  - 对每个匹配工作流：
    - 注入 `wf.global.TRIGGER = { kind, source, trace_id, event_id, payload }`。
    - 创建 `ServerWorkflowEngine(wf)` 并调用 `run()` 执行该工作流实例。
  - 若无匹配工作流则仅记录日志并跳过执行。

- 订阅请求与过滤器示例：
  - 在 `config/plugins.yaml` 中为触发插件设置：
    - `endpoint`：插件 gRPC 服务地址。
    - `consumer_group`：消费组（可选，用于并发消费策略）。
    - `filters`：订阅过滤条件（例如 `interval_ms`, `count`）。
  - 示例：`filters: { interval_ms: 10000, count: 0 }`。

## 参数插值与数据访问
- 插值引擎：`src/runners/utils.ts` 中的 `interpolate`
  - 在节点运行时对参数进行表达式求值，支持访问 `$P`、`$global`、`$inputs`、`$node`。
  - 通过 `safeEval` 保持表达式求值的安全性与隔离性。
- 常见用法：
  - 从 gRPC 触发器读取：`{{ $global.TRIGGER.payload.message }}`、`{{ $global.TRIGGER.payload.now_ms }}`。
  - 从内置 Webhook 读取：`{{ $Webhook.query.id }}`。
  - 组合上下文：利用 `$node.<id>.output` 访问前序节点结果，与 `$global` 共同使用实现条件与路由逻辑。

## 错误处理与可靠性
- gRPC 触发订阅：
  - 断线与错误由插件管理器自动重试，采用指数退避并在 `end` 事件后尝试重新订阅。
- 工作流执行：
  - 在 `WorkflowEngine` 与 `ServerWorkflowEngine` 内记录执行信息，失败时可定位到具体节点与参数。
- Webhook：
  - 服务端运行器在触发时返回明确的 `triggered` 与时间戳，便于审计与溯源。

## 关键代码位置
- 触发器识别与执行：
  - `src/core/WorkflowEngine.ts`
  - `src/server/engine.ts`
- gRPC 插件：
  - 管理与订阅：`src/runners/grpc/GrpcPluginManager.ts`
  - 插件示例：`plugins/timer_trigger/main.go`
- 内置运行器：
  - `manual`：`src/runners/manual/ManualNodeRunner.ts`
  - `webhook`：`src/runners/http/HttpNodeRunnerServer.ts`（服务端）、`HttpNodeRunner.ts`（客户端模拟）
  - `timer`：`src/server/scheduler.ts`（调度）、`src/runners/time/TimeNodeRunner.ts`（节点执行）
- 插值：`src/runners/utils.ts`
- 模板与帮助：
  - Built-ins：`src/builtins.ts`
  - 示例表达式：`src/components/HelpModal.tsx`

## 实践建议
- 选择触发器：
  - 简单定时 → 内置 `timer` 节点与 `scheduler.ts`
  - 更复杂或跨服务定时 → gRPC 插件（例如 `timer_trigger`）
  - 外部事件 → `webhook` 并在服务端部署 HTTP 路由
- 统一事件结构：尽量将插件 `payload` 结构稳定化，便于下游节点复用。
- 参数插值：优先使用 `$global.TRIGGER.payload` 访问事件数据，并结合 `$node` 上下文实现复杂编排。
- 健壮性：为 gRPC 触发器设置合适的重试策略与告警；Webhook 路由注意鉴权与限流。

---

如需扩展新的触发器：
1. 在插件或内置运行器中定义事件产生方式及 `payload` 格式。
2. 在工作流中新增起始节点，并确保引擎能够识别该 `kind`。
3. 在节点参数中通过插值表达式读取 `$global.TRIGGER` 数据并完成业务逻辑。