# GORM DB Operator 插件（db_operator）

通用数据库操作插件，基于 GORM，支持查询、聚合、写入与原生 SQL。可作为工作流中的动作节点使用，也可以配合 HTTP Gateway 触发器形成 API 风格的工作流。

## 特性
- 支持 `sqlite`、`mysql`、`postgres`、`sqlserver` 驱动
- 查询：选择列、别名、联表、条件、分组、排序、分页、总数计算
- 聚合：`sum/count/...`，可自定义别名
- 写入：`create/update/delete`，带安全保护（默认要求 where 条件）
- 原生 SQL：`raw_sql` + `raw_bindings`
- 事务与批操作：`use_tx` + `batch_ops`
- 调试：打印 SQL、慢 SQL 告警、DryRun 捕获 SQL

## 启动插件

```bash
cd plugins/gorm
go run main.go --port 50054
# 或构建二进制
go build -o gorm-plugin
./gorm-plugin --port 50054 --server http://localhost:3001
```

启动后会向 gFlow 服务注册插件（默认 `http://localhost:3001/api/plugins`）。

## 在配置文件中注册

在 `config/plugins.yaml` 中添加（已有示例）：

```yaml
plugins:
  - name: "db_operator"
    kind: "db_operator"
    endpoint: "localhost:50054"
    enabled: true
    health_check: true
    description: "数据库操作插件"
    version: "1.0.0"
    category: "plugin"
    icon: "Database"
    color: "green"
```

## 节点参数

插件在工作流节点中的 `parameters` 支持以下字段（键名与类型见 `plugins/gorm/dsl/parser.go` 与 `plugins/gorm/types.go`）：

- 连接配置
  - `driver`: 数据库类型（`sqlite`|`mysql`|`postgres`|`sqlserver`）
  - `dsn`: 连接串，例如 `file:test.db?cache=shared&_fk=1`（sqlite）
  - `alias`: 连接别名（可选；默认 `driver::dsn`）
  - `debug`:
    - `print`: `true|false` 是否打印 SQL
    - `level`: `error|warn|info` 打印级别
    - `slow_threshold_ms`: 慢 SQL 阈值（毫秒）
    - `capture`: `true|false` 是否 DryRun 捕获 SQL

- 操作类型
  - `op`: `find|first|count|aggregate|create|update|delete|raw`

- 查询构建
  - `table`: 主表名
  - `table_alias`: 主表别名
  - `select`: 选择的列数组，如 `["o.id","u.name AS user_name"]`
  - `joins`: 联表数组
    - 结构：`{ type, table, alias, on: { expr, values } }`
    - 例：`{ type: "left", table: "users", alias: "u", on: { expr: "u.id = o.user_id AND u.status = ?", values: ["active"] } }`
  - `where`: 条件数组（两种形式二选一）
    - 字段条件：`{ field, op, value }` 例：`{ field: "status", op: "eq", value: "paid" }`
    - 表达式条件：`{ expr, values }` 例：`{ expr: "created_at BETWEEN ? AND ?", values: ["2025-01-01","2025-12-31"] }`
  - `group_by`: 分组列数组
  - `having`: 分组过滤（同 `where` 结构）
  - `order_by`: 排序数组，例：`{ field: "created_at", dir: "desc" }`
  - `limit`, `offset`: 限制与偏移
  - `page`, `page_size`: 分页（内部转换为 limit/offset）
  - `calc_total`: 是否计算总数

- 聚合
  - `aggregations`: 例：`{ func: "sum", field: "amount", alias: "sum_amount" }`

- 写入与修改
  - `create_data`: 数组，例：`[{ name: "Alice" }, { name: "Bob" }]`
  - `update_data`: 对象，例：`{ status: "inactive" }`
  - `allow_full_table_write`: 允许无条件更新/删除，默认 `false`（安全保护）

- 原生 SQL
  - `raw_sql`: 字符串 SQL
  - `raw_bindings`: 绑定数组

- 事务与批操作
  - `use_tx`: `true|false` 是否使用事务
  - `batch_ops`: 批操作数组（每项结构与单次操作一致），在同一事务中执行

## 示例

### 查询 + 联表 + 分页 + 聚合
```yaml
parameters:
  driver: "sqlite"
  dsn: "file:test.db?cache=shared&_fk=1"
  alias: "sqlite_test"
  op: "find"
  table: "orders"
  table_alias: "o"
  select: ["o.id","u.name AS user_name","o.amount","o.status","o.created_at"]
  joins:
    - { type: "left", table: "users", alias: "u", on: { expr: "u.id = o.user_id AND u.status = ?", values: ["active"] } }
  where:
    - { field: "o.status", op: "eq", value: "paid" }
  order_by:
    - { field: "o.created_at", dir: "desc" }
  page: 1
  page_size: 10
  calc_total: true
  debug: { print: true, capture: true, level: "info", slow_threshold_ms: 200 }
```

### 写入（批量创建）
```yaml
parameters:
  driver: "sqlite"
  dsn: "file:test.db?cache=shared&_fk=1"
  op: "create"
  table: "users"
  create_data:
    - { name: "Alice", status: "active" }
    - { name: "Bob", status: "inactive" }
```

### 更新（带保护）
```yaml
parameters:
  driver: "sqlite"
  dsn: "file:test.db?cache=shared&_fk=1"
  op: "update"
  table: "users"
  where:
    - { field: "id", op: "eq", value: 1 }
  update_data:
    status: "inactive"
```

### 删除（需显式允许全表写）
```yaml
parameters:
  driver: "sqlite"
  dsn: "file:test.db?cache=shared&_fk=1"
  op: "delete"
  table: "orders"
  where:
    - { field: "status", op: "eq", value: "cancelled" }
  # 如需无 where 删除：allow_full_table_write: true
```

### 原生 SQL
```yaml
parameters:
  driver: "sqlite"
  dsn: "file:test.db?cache=shared&_fk=1"
  op: "raw"
  raw_sql: "SELECT id, name, status FROM users ORDER BY id ASC"
  raw_bindings: []
```

## 端到端示例工作流

完整示例见 `plugins/gorm/sqlite-example.yaml`（工作流名称：`SQLite DB Operator Workflow`）。该工作流包含：
- 触发器：`http_gateway`（端口 8081，路径 `POST /sqlite-run`）
- 一系列 `db_operator` 节点：建表、插入、联表查询、聚合、更新与删除、原生查询
- 最终 `response` 节点，返回结果到 HTTP 客户端

触发示例：
```bash
curl -X POST "http://localhost:8081/sqlite-run" \
  -H "X-API-Key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 运行输出

节点返回的结构会写入 `output` 字段，包括：
- `rows`/`row`：查询结果
- `total`：总数（当 `calc_total: true`）
- `page`/`page_size`：分页信息
- `aggregates`：聚合结果
- `affected`：影响行数（写操作）
- 调试字段（当 `debug.capture: true`）：`debug_sql`、`debug_vars`

## 调试建议

- 为开发环境开启 `debug.print: true` 与合适的 `debug.level`
- 通过 `debug.slow_threshold_ms` 观察慢 SQL
- 使用 `debug.capture: true` 查看 DryRun 生成的 SQL 语句

