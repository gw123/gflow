# HTTP Gateway Plugin

监听指定 HTTP 路由，将请求的 `headers`、`query`、`body` 等信息作为触发事件 (`TriggerEvent`) 推送到 gFlow，引擎将其传递给下一个节点作为参数。

## 元数据

- 名称：`http_gateway`
- 分类：`trigger`
- 类型：`trigger`

## 运行

```bash
cd plugins/gateway
go run main.go --port 50053
```

默认会尝试向 `http://localhost:3001/api/plugins` 注册插件（可用 `--server` 变更）。

## Filters（在 `config/plugins.yaml` 中配置）

支持以下 `filters` 字段（均为字符串）：

- `http_port`：HTTP 监听端口，默认 `8080`
- `routes`：逗号分隔，格式 `METHOD:/path`，例如：`POST:/webhook,GET:/notify`
- `routes_json`：更灵活的 JSON 配置，示例：
  ```json
  [
    {"path":"/webhook","methods":["POST"],"target_workflow":"MyWorkflow"},
    {"path":"/notify","methods":["GET"]}
  ]
  ```
- `target_workflow`：未使用 `routes_json` 时的默认目标工作流
- `api_key`：基础认证 API Key（`X-API-Key` 或 `Authorization: Bearer <token>`）
- `hmac_secret`：启用 HMAC 校验（签名为十六进制字符串）
- `signature_header`：签名头名，默认 `X-Signature`
- `timestamp_header`：时间戳头名（毫秒），默认 `X-Timestamp`
- `timestamp_skew_ms`：允许时间偏差，默认 `300000`（5 分钟）

## 认证说明

当提供 `hmac_secret` 时，按以下规则校验签名：

```
signature = HMAC_SHA256(secret, method|path|timestamp|body)
```

- `method`：HTTP 方法，如 `POST`
- `path`：请求路径，如 `/webhook`
- `timestamp`：来自 `timestamp_header` 的毫秒时间戳
- `body`：原始请求体字节

若未提供 `hmac_secret`，则使用 `api_key` 进行基础认证。

## 推送的事件载荷示例

```json
{
  "method": "POST",
  "path": "/webhook",
  "headers": {"X-Api-Key": "..."},
  "query": {"q": "123"},
  "body": {"foo": "bar"},
  "raw_body": "{\"foo\":\"bar\"}",
  "remote_addr": "127.0.0.1:12345"
}
```

引擎会将此 `payload` 作为触发节点的输出，供后续节点使用。

## config 示例

```yaml
plugins:
  - name: "HTTP Gateway"
    kind: "http_gateway"
    endpoint: "localhost:50053"
    enabled: true
    health_check: true
    description: "监听路由推送触发事件"
    version: "1.0.0"
    category: "trigger"
    icon: "Globe"
    color: "green"
    consumer_group: "default"
    filters:
      http_port: "8080"
      routes: "POST:/webhook,GET:/notify"
      # 或者使用 routes_json 进行更复杂的配置
      # routes_json: "[{\"path\":\"/webhook\",\"methods\":[\"POST\"],\"target_workflow\":\"MyWorkflow\"}]"
      api_key: "your-api-key"
      # 可选启用 HMAC
      # hmac_secret: "your-secret"
      # signature_header: "X-Signature"
      # timestamp_header: "X-Timestamp"
      # timestamp_skew_ms: "300000"
```

测试

 curl -X POST http://localhost:8080/api/v1/orders\?sync_response=true\
     -H 'X-API-Key: gateway-secret-123' \
     -H 'Content-Type: application/json' \
     -d '{\"productId\": \"PROD-123\", \"quantity\": 2}' | jq



 curl -X GET http://localhost:8080/api/v1/db | jq

curl -X GET http://localhost:8080/api/v1/db | jq