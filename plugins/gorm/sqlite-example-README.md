# SQLite 测试工作流（db_operator + http_gateway）

本示例工作流位于 `plugins/gorm/sqlite-example.yaml`，包含：
- 手动触发节点 `ManualTrigger`（`http_gateway` 插件，HTTP 触发）
- 数据库初始化（建表）与数据插入
- 联表查询（`JOIN`）、分页、聚合（`SUM/COUNT`）
- 更新与删除
- 原生 SQL 查询与 SQL 调试捕获

## 前置条件
- gFlow 服务已启动（默认 `http://localhost:3001`）
- 插件均可运行并注册到 gFlow

## 启动插件
- 启动数据库插件：
  ```
  cd plugins/gorm
  go run main.go --port 50054
  ```
- 启动网关插件（用于手动触发）：
  ```
  cd plugins/gateway
  go run main.go --port 50053
  ```

插件启动后会自动向 gFlow 注册（默认地址 `http://localhost:3001/api/plugins`）。

## 导入工作流
- 在 gFlow 引擎中导入 `plugins/gorm/sqlite-example.yaml`
- 工作流名称：`sqlite-db-operator-example`
- 手动触发配置：
  - 监听端口：`8081`
  - 路径：`POST /sqlite-run`
  - API Key：`test-api-key-123`

## 手动触发
- 触发工作流（需网关插件运行）：
  ```
  curl -X POST "http://localhost:8081/sqlite-run" \
    -H "X-API-Key: test-api-key-123" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
- 预期效果：
  - 触发节点 `ManualTrigger` 推送事件
  - 按 `connections` 自动执行后续各节点：
    1. `InitUsersTable` 与 `InitOrdersTable`：DDL 建表
    2. `InsertUsers` 与 `InsertOrders`：批量插入数据
    3. `JoinQuery`：左联 `users` + 分页 + 总数计算；开启 SQL 捕获
    4. `Aggregate`：订单聚合 `sum(amount)`、`count(id)`；开启 SQL 捕获
    5. `UpdateUser`：将用户 `id=1` 状态改为 `inactive`
    6. `DeleteCancelled`：删除 `status="cancelled"` 的订单
    7. `RawSelectUsers`：原生查询用户列表；开启 SQL 捕获

## 观察运行结果
- 每个节点返回的 `output` 字段包含：
  - 查询类：`rows`（数组）、`row`（单条）、`total`、`page`、`page_size`、`aggregates`
  - 写入类：`affected`
  - 调试：当 `debug.capture=true` 时，包含 `debug_sql` 与 `debug_vars`
- 例如 `JoinQuery` 节点输出：
  ```json
  {
    "rows": [
      { "id": 101, "user_name": "Alice", "amount": 1200.50, "status": "paid", "created_at": "..." }
    ],
    "total": 3,
    "page": 1,
    "page_size": 10,
    "debug_sql": "SELECT o.id, u.name AS user_name, o.amount, o.status, o.created_at FROM orders o LEFT JOIN users u ON u.id = o.user_id AND u.status = ? WHERE o.status = ? ORDER BY o.created_at DESC LIMIT 10",
    "debug_vars": ["active", "paid"]
  }
  ```
- 例如 `Aggregate` 节点输出：
  ```json
  {
    "aggregates": { "sum_amount": 1651.25, "cnt": 3 },
    "debug_sql": "SELECT SUM(amount) AS sum_amount, COUNT(id) AS cnt FROM orders WHERE created_at BETWEEN ? AND ?",
    "debug_vars": ["2025-01-01", "2025-12-31"]
  }
  ```

## 常见问题
- 插件未注册：
  - 检查 gFlow 服务是否运行，或启动插件时使用 `--server` 指定服务地址
- 手动触发 401：
  - 确认请求头 `X-API-Key: test-api-key-123` 与触发节点 `filters.api_key` 一致
- SQLite 文件位置：
  - 本示例使用 `file:test.db` 相对路径，可根据需要更改到绝对路径或内存库（`file::memory:?cache=shared`）

