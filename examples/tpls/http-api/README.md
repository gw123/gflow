# HTTP Gateway 触发器示例

这个目录包含了使用 HTTP Gateway 触发器的工作流示例，展示了如何配置和使用 HTTP Gateway 插件来处理外部 HTTP 请求。

## 概述

HTTP Gateway 插件是一个触发器节点，它可以：
- 监听指定端口和路由的 HTTP 请求
- 支持多种路由配置格式
- 支持 API Key 认证
- 支持 HMAC 签名认证
- 将请求数据转换为工作流事件

## 示例文件

### 1. 基础示例 - `gateway-trigger.yaml`

**功能**：展示 HTTP Gateway 触发器的基本用法

**配置要点**：
- 监听端口：8080
- 路由配置：逗号分隔格式
- API Key 认证
- 处理不同路由和方法的请求

**使用场景**：
- 简单的 API 端点
- 外部系统回调
- 基础的 Webhook 处理

### 2. 高级示例 - `gateway-advanced.yaml`

**功能**：展示 HTTP Gateway 触发器的高级配置

**配置要点**：
- 监听端口：8081
- 路由配置：JSON 格式（更灵活）
- HMAC 签名认证
- 支持动态路径参数
- 支持通配符路由
- 更复杂的请求处理逻辑

**使用场景**：
- 复杂的 API 服务
- 安全要求较高的场景
- 多类型 Webhook 处理
- 需要精细路由控制的场景

## 配置说明

### 主要参数

| 参数名 | 类型 | 描述 | 默认值 |
|--------|------|------|--------|
| http_port | 字符串 | HTTP 监听端口 | 8080 |
| routes | 字符串 | 逗号分隔的路由配置，格式：METHOD:/path | /webhook（POST/GET） |
| routes_json | 字符串 | JSON 格式的路由配置 | 无 |
| api_key | 字符串 | API Key 认证密钥 | 无 |
| hmac_secret | 字符串 | HMAC 签名密钥 | 无 |
| signature_header | 字符串 | 签名头名称 | X-Signature |
| timestamp_header | 字符串 | 时间戳头名称 | X-Timestamp |
| timestamp_skew_ms | 字符串 | 时间戳偏差（毫秒） | 300000（5分钟） |
| target_workflow | 字符串 | 默认目标工作流 | 无 |

### 路由配置格式

#### 1. 逗号分隔格式（routes）

```
routes: "POST:/api/v1/orders,GET:/api/v1/status"
```

#### 2. JSON 格式（routes_json）

```json
[
  {
    "path": "/api/v2/users",
    "methods": ["POST", "GET"],
    "target_workflow": "WorkflowName"
  },
  {
    "path": "/api/v2/products/:id",
    "methods": ["GET", "PUT", "DELETE"],
    "target_workflow": "WorkflowName"
  }
]
```

## 如何运行

1. **启动工作流服务器**

```bash
# 在项目根目录执行
npm run dev:server
```

2. **启动前端开发服务器（可选，用于可视化编辑）**

```bash
# 在项目根目录执行
npm run dev
```

3. **同时启动前端和后端**

```bash
# 在项目根目录执行
npm run dev:all
```

4. **部署和运行示例工作流**

### 使用脚本运行

项目提供了便捷的运行脚本：

```bash
# 进入示例目录
cd examples/tpls/http-api

# 运行基础示例
./run.sh gateway-trigger.yaml

# 运行高级示例  
./run.sh gateway-advanced.yaml
```

### 手动运行

```bash
# 1. 确保服务器正在运行
npm run dev:server

# 2. 使用辅助脚本运行工作流
cd examples/tpls
./run-workflow.sh http-api/gateway-trigger.yaml
./run-workflow.sh http-api/gateway-advanced.yaml
```

### 直接使用 API

```bash
# 转换 YAML 为 JSON（需要 Python 和 PyYAML）
python3 -c "import yaml, json; print(json.dumps(yaml.safe_load(open('examples/tpls/http-api/gateway-trigger.yaml'))))" > workflow.json

# 发送到服务器执行
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow": $(cat workflow.json)}'
```

4. **测试请求**

```bash
# 测试基础示例 - 创建订单
curl -X POST http://localhost:8080/api/v1/orders \
  -H "X-API-Key: gateway-secret-123" \
  -H "Content-Type: application/json" \
  -d '{"productId": "PROD-123", "quantity": 2, "amount": 199.98}'

# 测试基础示例 - 查询状态
curl -X GET "http://localhost:8080/api/v1/status?orderId=ORD-123456" \
  -H "X-API-Key: gateway-secret-123"

# 测试高级示例 - 创建用户
curl -X POST http://localhost:8081/api/v2/users \
  -H "X-Gateway-Timestamp: $(date +%s000)" \
  -H "X-Gateway-Signature: <generated-signature>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}'
```

## HMAC 签名生成

当使用 HMAC 认证时，客户端需要生成正确的签名：

### 签名算法

```
signature = HMAC_SHA256(secret, method|path|timestamp|body)
```

### 示例（Node.js）

```javascript
const crypto = require('crypto');

const secret = 'advanced-secret-key-2024';
const method = 'POST';
const path = '/api/v2/users';
const timestamp = Date.now().toString();
const body = JSON.stringify({ name: 'Test User', email: 'test@example.com' });

const data = `${method}|${path}|${timestamp}|${body}`;
const signature = crypto.createHmac('sha256', secret)
  .update(data)
  .digest('hex');

console.log('Signature:', signature);
```

## 请求数据结构

HTTP Gateway 触发器会将请求转换为以下数据结构传递给工作流：

```json
{
  "method": "POST",
  "path": "/api/v1/orders",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "gateway-secret-123"
  },
  "query": {
    "param1": "value1"
  },
  "body": {
    "productId": "PROD-123",
    "quantity": 2
  },
  "raw_body": "{\"productId\": \"PROD-123\", \"quantity\": 2}",
  "remote_addr": "127.0.0.1:12345"
}
```

## 最佳实践

1. **安全配置**
   - 始终使用认证机制（API Key 或 HMAC）
   - 定期更换密钥
   - 限制时间戳偏差

2. **路由设计**
   - 使用 RESTful 路由设计
   - 合理使用路径参数和通配符
   - 明确区分不同资源的路由

3. **请求处理**
   - 验证所有输入数据
   - 处理错误情况
   - 记录关键日志

4. **性能优化**
   - 避免在触发器节点中执行复杂逻辑
   - 使用异步处理长时间运行的任务
   - 合理设置超时时间

## 故障排查

### 常见问题

1. **请求被拒绝**
   - 检查 API Key 是否正确
   - 检查 HMAC 签名是否正确
   - 检查时间戳是否在允许偏差范围内

2. **路由不匹配**
   - 检查路由配置是否正确
   - 检查请求方法是否匹配
   - 检查路径是否完全匹配

3. **服务器未响应**
   - 检查工作流是否已部署
   - 检查工作流是否正在运行
   - 检查端口是否被占用

4. **日志查看**

工作流日志会直接输出到服务器控制台。如果您使用 `npm run dev:server` 或 `npm run dev:all` 启动服务器，可以直接在控制台中查看实时日志。

对于已运行的工作流执行结果，可以通过 API 获取：

```bash
# 获取最近的工作流执行记录
curl -s http://localhost:3001/api/executions | python3 -m json.tool
```

## 更多信息

- [HTTP Gateway 插件源码](../gateway/main.go)
- [工作流配置文档](../../../../docs/config.md)
- [触发器节点文档](../../../../docs/trigger-nodes.md)
