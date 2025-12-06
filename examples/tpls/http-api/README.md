# HTTP API 调用示例

本目录包含 HTTP 请求和 Webhook 相关的工作流示例。

## 文件说明

### rest-api-call.yaml
演示如何调用外部 REST API：
- GET/POST 请求
- 设置 Headers
- 处理响应

### webhook-trigger.yaml
Webhook 触发的工作流：
- 配置 Webhook 端点
- 处理传入请求
- 响应外部系统

## 核心概念

### HTTP 节点参数

```yaml
- name: "CallAPI"
  type: "http"
  parameters:
    method: "POST"           # GET, POST, PUT, DELETE, PATCH
    url: "https://api.example.com/endpoint"
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer {{ $global.apiKey }}"
    body:
      key: "value"
```

### Webhook 节点参数

```yaml
- name: "WebhookReceiver"
  type: "webhook"
  parameters:
    method: "POST"           # 接受的 HTTP 方法
    path: "my-webhook"       # 路径: /webhook/my-webhook
```

## 测试 Webhook

```bash
# 触发 Webhook
curl -X POST http://localhost:3001/webhook/my-webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {"key": "value"}}'
```
