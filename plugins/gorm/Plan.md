# gFlow GORM 数据库插件技术实现

本插件在 gFlow 插件框架下，提供基于 `gorm` 的通用数据库操作能力，覆盖查询、聚合、写入与原生 SQL。设计目标是：统一 DSL、避免手写 SQL 拼接、跨驱动可移植、具备分页与事务等常见能力。

## 目标与范围
- 统一 DSL：`where/order/group/having/select/limit/offset/page/page_size/aggregations`
- 常见操作：`find/first/count/aggregate/create/update/delete/raw`
- 多驱动支持：MySQL、PostgreSQL、SQLite、SQLServer
- 安全与性能：参数绑定、事务、连接池、慢查询日志

## 架构
- 插件形态：`CATEGORY_ACTION` + `NODE_TYPE_PROCESSOR`，通过 `Run` 执行
- 入口：`base.Serve(plugin)` 启动 gRPC 服务并自动注册到 gFlow
- 参数解析：从 `RunRequest.parameters` 解析 DSL，映射到 `gorm` 链式调用
- 连接管理：`driver + dsn + alias` 生成/缓存 `*gorm.DB`；惰性初始化
- 结果输出：流式日志与最终结果通过 `RunResponse` 返回

## 依赖
- `gorm.io/gorm` + 对应驱动（`mysql/postgres/sqlite/sqlserver`）
- 复用 `plugins/base-go` 提供的类型转换与服务封装

## 元数据（建议）
- 基本信息：`name=db_operator`，`category=ACTION`，`node_type=PROCESSOR`
- 密钥信息：
  - `driver`: `string`（`mysql|postgres|sqlite|sqlserver`）
  - `dsn`: `string`（或从 `credential` 读取）
  - `alias`: `string`（连接别名，用于复用）
- 输入参数（关键）：
  - `op`: `string`（`find|first|count|aggregate|create|update|delete|raw`）
  - `table`: `string`
  - `select`: `string|string[]`
  - `joins`: `JoinExpr[]`
  - `where`: `WhereExpr[]`
  - `group_by`: `string[]`
  - `having`: `HavingExpr[]`
  - `order_by`: `OrderExpr[]`
  - `limit`: `int`，`offset`: `int`
  - `page`: `int`，`page_size`: `int`，`calc_total`: `bool`
  - `aggregations`: `AggExpr[]`
  - `create_data`: `map` 或 `map[]`
  - `update_data`: `map`
  - `raw_sql`: `string`，`raw_bindings`: `any[]`
  - `use_tx`: `bool`，`batch_ops`: `OpSpec[]`（可选，事务内批处理）
  - `debug`: `DebugOptions`（`print|capture|level|slow_threshold_ms`）
- 输出参数：
  - `rows`: `list<map>`
  - `row`: `map`
  - `total`: `int`
  - `page`: `int`，`page_size`: `int`
  - `affected`: `int`
  - `aggregates`: `map<string, number>`

## 查询 DSL
- `WhereExpr`（两种形态）：
  - 结构化：`{ field, op, value }`，`op=eq|ne|gt|lt|gte|lte|like|ilike|in|between|isnull|notnull`
  - 原生表达式：`{ expr: "created_at BETWEEN ? AND ?", values: ["2025-01-01","2025-12-31"] }`
- `OrderExpr`：`{ field: "created_at", dir: "desc" }`
- `AggExpr`：`{ func: "sum", field: "amount", alias: "sum_amount" }`
- `HavingExpr`：同 `WhereExpr`，作用于聚合结果
- `Select`：`["id","name","SUM(amount) AS total_amount"]` 或 `"id,name,total_amount"`
- `JoinExpr`：
  - 结构化：`{ type, table, alias, on: { expr, values[] } }`
  - `type=inner|left|right|cross`，默认 `inner`
  - 例：`{ "type": "left", "table": "users", "alias": "u", "on": { "expr": "u.id = orders.user_id AND u.status = ?", "values": ["active"] } }`

## 操作映射
- `find`：`db.Table(table).Select(select).Where(...).Group(...).Having(...).Order(...).Limit(...).Offset(...).Find(&rows)`
  - 若存在 `aggregations`：基于相同 `where` 条件额外执行一次聚合查询，结果放入 `aggregates`
- `first`：同 `find`，`Limit(1)` 并返回 `row`
- `count`：
  - 无分组：`baseQuery.Count(&total)`
  - 有分组：返回每组计数（可选扩展）
- `aggregate`：`db.Select("SUM(amount) AS sum_amount, AVG(amount) AS avg_amount").Scan(&row)`，再整理为 `aggregates`
- `create`：`db.Table(table).Create(&create_data)`（批量：传 `[]map`）
- `update`：`db.Table(table).Where(...).Updates(update_data)`（无 `where` 默认拒绝）
- `delete`：`db.Table(table).Where(...).Delete(nil)`（无 `where` 默认拒绝）
- `raw`：`db.Raw(raw_sql, raw_bindings...).Scan(&rows)`

## 联表查询
- DSL：
  ```json
  {
    "table": "orders",
    "select": ["o.id","u.name AS user_name","o.amount"],
    "joins": [
      { "type": "left", "table": "users", "alias": "u", "on": { "expr": "u.id = o.user_id AND u.status = ?", "values": ["active"] } },
      { "type": "inner", "table": "shops", "alias": "s", "on": { "expr": "s.id = u.shop_id" } }
    ],
    "where": [{ "expr": "o.created_at >= ?", "values": ["2025-01-01"] }],
    "order_by": [{ "field": "o.created_at", "dir": "desc" }]
  }
  ```
- 映射：
  - 构造基础表别名 `o`（可与 `table_alias` 参数协同）
  - 将 `JoinExpr` 转换为 `Joins("<JOIN> <table> <alias> ON <expr>", ...values)`
  - 例：
    - `db.Table("orders AS o").Joins("LEFT JOIN users u ON u.id = o.user_id AND u.status = ?", "active").Joins("INNER JOIN shops s ON s.id = u.shop_id")`
- 注意：
  - `select` 中请使用明确别名，避免列名冲突
  - 聚合时配合 `group_by/having`，同单表语义

## 分页
- 优先使用 `page/page_size`，其次 `limit/offset`
- `calc_total=true`：构造不含 `limit/offset/order` 的计数查询并返回 `total`
- 可返回 `has_next = page*page_size < total`（作为元数据）

## 事务与批量
- `use_tx=true`：`db.Transaction(func(tx *gorm.DB) error { ... })`
- `batch_ops`：在同一事务内按顺序执行多操作；任一失败回滚

## 错误与健康
- 错误：返回 `RunResponse{type=ERROR}`，包含 `code/message`
- `HealthCheck`：`PingContext` 并返回连接状态与驱动信息
- `TestCredential`：`driver+dsn` 建连并 `Ping` 验证

## 性能与安全
- 全部条件使用参数绑定（`?`），拒绝字符串拼接
- 默认禁止无 `where` 的 `update/delete`（需 `allow_full_table_write=true` 显式放行）
- 连接池：`MaxOpenConns/MaxIdleConns/ConnMaxLifetime` 可配；慢查询日志与级别可配
- 大结果集：必须显式分页；必要时提供流式消费（可扩展）
- 列选择：鼓励显式 `select`，避免 `SELECT *`

## SQL 调试
- 参数：
  - `debug.print`: `bool`，打印 SQL 与耗时到日志（等价启用 `db.Debug()` 并设置 Logger 级别）
  - `debug.capture`: `bool`，捕获最终 SQL 字符串并随结果返回
  - `debug.level`: `string`（`silent|error|warn|info`），控制日志级别
  - `debug.slow_threshold_ms`: `int`，慢查询阈值
- 捕获方式：
  - 使用 `DryRun` 模式：`db.Session(&gorm.Session{DryRun: true, Logger: logger.Default.LogMode(logger.Info)}).Find(...)` 获取 `Statement.SQL`
  - 写操作同理，可在执行前生成 SQL 供审计
- 返回：
  - 当 `debug.capture=true`：在 `ResultPayload.Output` 附加 `debug_sql`（带参数绑定的最终 SQL）与 `debug_vars`（参数值）
- 示例：
  ```json
  {
    "debug": { "print": true, "capture": true, "level": "info", "slow_threshold_ms": 200 }
  }
  ```

## 参数示例
认证
{
  "driver": "mysql",
  "dsn": "user:pass@tcp(localhost:3306)/shop?charset=utf8mb4&parseTime=True&loc=Local",
  "alias": "shop_read"
}

参数（全功能）
```json
{
  "op": "find",
  "table": "orders",
  "select": ["o.id", "u.name AS user_name", "o.amount", "o.status", "o.created_at"],
  "joins": [
    { "type": "left", "table": "users", "alias": "u", "on": { "expr": "u.id = o.user_id" } }
  ],
  "where": [
    { "field": "o.status", "op": "eq", "value": "paid" },
    { "expr": "o.created_at BETWEEN ? AND ?", "values": ["2025-01-01", "2025-12-31"] }
  ],
  "group_by": ["o.user_id"],
  "having": [{ "expr": "SUM(o.amount) > ?", "values": [1000] }],
  "order_by": [{ "field": "o.created_at", "dir": "desc" }],
  "page": 1,
  "page_size": 20,
  "calc_total": true,
  "aggregations": [
    { "func": "sum", "field": "o.amount", "alias": "sum_amount" },
    { "func": "count", "field": "o.id", "alias": "cnt" }
  ],
  "debug": { "print": true, "capture": true }
}
```

## 输出示例
```json
{
  "rows": [
    { "id": 101, "user_name": "Alice", "amount": 1200.50, "status": "paid", "created_at": "..." }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "aggregates": { "sum_amount": 32500.75, "cnt": 250 },
  "debug_sql": "SELECT o.id, u.name AS user_name... FROM orders o LEFT JOIN users u ON... WHERE... LIMIT 20",
  "debug_vars": ["paid", "2025-01-01", "2025-12-31", 1000]
}
```

## 集成要点
- 启动：`base.Serve(plugin)` 并设置端口与日志
- DSL 作为节点参数传入；可来自父节点或全局变量
- 若使用 `credential`：在 `GetMetadata` 中设置 `credential_def`（`driver/dsn` 等），`Init` 时读取并建连缓存

## 扩展点
- `Preload` / 关联查询
- Keyset 分页（`seek_after`）
- 多租户自动 `tenant_id` 注入
- SQL 审计与追踪（慢查询、影响行数）
