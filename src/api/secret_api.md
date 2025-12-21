# 密钥(Secret) API 文档

## 概述
本文档提供了密钥管理相关的API接口说明，用于指导前端Agent生成正确的代码。

## 基础信息
- API 版本: v1
- API 前缀: `/api/v1`
- 认证方式: JWT Token

## 密钥实体结构

```json
{
  "id": 1,
  "user_id": 1,
  "name": "openai-api-key",
  "project_name": "ai-project",
  "kind": "llm",
  "type": "openai",
  "provider": "openai",
  "desc": "OpenAI API密钥",
  "value": { // 根据不同密钥类型，结构会有所不同
    "openai_proxy": "https://api.openai.com/v1",
    "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## 接口列表

### 1. 创建密钥

**请求**
- 方法: `POST`
- URL: `/api/v1/secrets`
- 认证: 需要
- Content-Type: `application/json`

**请求体**
```json
{
  "name": "openai-api-key",
  "project_name": "ai-project",
  "type": "openai",
  "value": {
    "openai_proxy": "https://api.openai.com/v1",
    "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**参数说明**
- `name`: 密钥名称 (必填)
- `project_name`: 项目名称 (可选)
- `type`: 密钥类型 (必填)
- `value`: 密钥值 (必填) - 根据不同密钥类型，结构会有所不同

**响应**
```json
{
  "code": "success",
  "message": "密钥创建成功",
  "data": null
}
```

### 2. 根据ID获取密钥

**请求**
- 方法: `GET`
- URL: `/api/v1/secrets/{id}`
- 认证: 需要

**路径参数**
- `id`: 密钥ID (必填)

**响应**
```json
{
  "code": "success",
  "message": "获取密钥成功",
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "openai-api-key",
    "project_name": "ai-project",
    "kind": "llm",
    "type": "openai",
    "provider": "openai",
    "desc": "OpenAI API密钥",
    "value": {
      "openai_proxy": "https://api.openai.com/v1",
      "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

### 3. 根据名称获取密钥

**请求**
- 方法: `GET`
- URL: `/api/v1/secrets/byName/{secretName}`
- 认证: 需要

**路径参数**
- `secretName`: 密钥名称 (必填)

**响应**
```json
{
  "code": "success",
  "message": "获取密钥成功",
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "openai-api-key",
    "project_name": "ai-project",
    "kind": "llm",
    "type": "openai",
    "provider": "openai",
    "desc": "OpenAI API密钥",
    "value": {
      "openai_proxy": "https://api.openai.com/v1",
      "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

### 4. 根据提供者获取密钥

**请求**
- 方法: `GET`
- URL: `/api/v1/secrets/bySecretType/{secretKind}/{secretType}/{provider}`
- 认证: 需要

**路径参数**
- `secretKind`: 密钥大分类 (必填，如："llm", "database", "storage")
- `secretType`: 密钥类型 (必填，如："openai", "mysql", "s3")
- `provider`: 服务提供方 (可选，如："openai", "aws")

**查询参数**
- `keyword`: 关键词搜索 (可选)

**响应**
```json
{
  "code": "success",
  "message": "获取密钥列表成功",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "openai-api-key",
      "project_name": "ai-project",
      "kind": "llm",
      "type": "openai",
      "provider": "openai",
      "desc": "OpenAI API密钥",
      "value": {
        "openai_proxy": "https://api.openai.com/v1",
        "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 1,
    "page_num": 1,
    "page_size": 20
  }
}
```

### 5. 获取密钥列表

**请求**
- 方法: `GET`
- URL: `/api/v1/secrets`
- 认证: 需要

**查询参数**
- `type`: 密钥类型过滤 (可选)
- `keyword`: 关键词搜索 (可选)
- `page_num`: 页码 (可选，默认：1)
- `page_size`: 每页大小 (可选，默认：20)

**响应**
```json
{
  "code": "success",
  "message": "获取密钥列表成功",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "openai-api-key",
      "project_name": "ai-project",
      "kind": "llm",
      "type": "openai",
      "provider": "openai",
      "desc": "OpenAI API密钥",
      "value": {
        "openai_proxy": "https://api.openai.com/v1",
        "openai_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "name": "mysql-db-credentials",
      "project_name": "db-project",
      "kind": "database",
      "type": "mysql",
      "provider": "mysql",
      "desc": "MySQL数据库凭证",
      "value": {
        "hostname": "db.example.com",
        "port": "3306",
        "database": "exampledb",
        "username": "exampleuser",
        "password": "examplepassword"
      },
      "created_at": "2025-01-02T00:00:00Z",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 2,
    "page_num": 1,
    "page_size": 20
  }
}
```

### 6. 更新密钥

**请求**
- 方法: `PUT`
- URL: `/api/v1/secrets/{id}`
- 认证: 需要
- Content-Type: `application/json`

**路径参数**
- `id`: 密钥ID (必填)

**请求体**
```json
{
  "name": "openai-api-key-updated",
  "project_name": "ai-project-updated",
  "type": "openai",
  "value": {
    "openai_proxy": "https://api.openai.com/v1",
    "openai_api_key": "sk-new-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**参数说明**
- `name`: 密钥名称 (必填)
- `project_name`: 项目名称 (可选)
- `type`: 密钥类型 (必填)
- `value`: 密钥值 (必填)

**响应**
```json
{
  "code": "success",
  "message": "密钥更新成功",
  "data": null
}
```

### 7. 删除密钥

**请求**
- 方法: `DELETE`
- URL: `/api/v1/secrets/{id}`
- 认证: 需要

**路径参数**
- `id`: 密钥ID (必填)

**响应**
```json
{
  "code": "success",
  "message": "密钥删除成功",
  "data": null
}
```

### 8. 获取密钥模板

**请求**
- 方法: `GET`
- URL: `/api/v1/secret_tpls`
- 认证: 需要

**响应**
```json
[
  {
    "name": "mysql",
    "type": "database",
    "value": {
      "hostname": "db.example.com",
      "port": "3306",
      "database": "exampledb",
      "username": "exampleuser",
      "password": "examplepassword"
    },
    "validation": {
      "hostname": "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      "port": "^[0-9]{1,5}$",
      "database": "^[a-zA-Z0-9_]+$",
      "username": "^[a-zA-Z0-9_]+$",
      "password": "^[^\\s]+$"
    }
  },
  {
    "name": "openai",
    "type": "llm",
    "value": {
      "openai_proxy": "https://api.openai.com/v1",
      "openai_api_key": "example-openai-api-key"
    },
    "validation": {
      "openai_proxy": "^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$",
      "openai_api_key": "^sk-[A-Za-z0-9_-]+$"
    }
  }
  // 更多模板...
]
```

## 常用密钥类型

### LLM 类型
- `openai`: OpenAI API密钥
- `azure`: Azure OpenAI API密钥
- `volcengine`: 火山引擎API密钥
- `ollama`: Ollama模型密钥
- `qwen`: 通义千问API密钥
- `claude`: Claude API密钥
- `gemini`: Gemini API密钥
- `deepseek`: DeepSeek API密钥

### 数据库类型
- `mysql`: MySQL数据库凭证
- `pg`: PostgreSQL数据库凭证
- `mongodb`: MongoDB数据库凭证
- `redis`: Redis缓存凭证
- `elasticsearch`: Elasticsearch凭证
- `clickhouse`: ClickHouse数据库凭证
- `tidb`: TiDB数据库凭证
- `cassandra`: Cassandra数据库凭证
- `influxdb`: InfluxDB数据库凭证

### 存储类型
- `s3`: S3存储凭证
- `ftp`: FTP存储凭证

### 消息队列类型
- `rocketmq`: RocketMQ凭证
- `kafka`: Kafka凭证
- `rabbitmq`: RabbitMQ凭证

### 其他类型
- `feishu`: 飞书API凭证
- `smtp`: SMTP邮件服务器凭证
- `aliyun_sms`: 阿里云短信凭证
- `tencent_sms`: 腾讯云短信凭证
- `alipay`: 支付宝支付凭证
- `wechat_pay`: 微信支付凭证
- `ssh`: SSH主机凭证
- `k8s`: Kubernetes集群凭证

## 代码示例

### 创建密钥示例 (JavaScript/TypeScript)

```javascript
async function createSecret(secretData) {
  const token = localStorage.getItem('token'); // 从本地存储获取JWT令牌
  const response = await fetch('/api/v1/secrets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(secretData)
  });
  return await response.json();
}

// 使用示例
const secretData = {
  name: 'openai-api-key',
  type: 'openai',
  value: {
    openai_proxy: 'https://api.openai.com/v1',
    openai_api_key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
};

createSecret(secretData)
  .then(result => {
    if (result.code === 'success') {
      console.log('密钥创建成功');
    } else {
      console.error('密钥创建失败:', result.message);
    }
  })
  .catch(error => {
    console.error('API请求失败:', error);
  });
```

### 获取密钥列表示例 (JavaScript/TypeScript)

```javascript
async function getSecretList(params = {}) {
  const token = localStorage.getItem('token');
  const queryParams = new URLSearchParams(params).toString();
  const url = `/api/v1/secrets?${queryParams}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// 使用示例
getSecretList({
  type: 'openai',
  page_num: 1,
  page_size: 10
})
  .then(result => {
    if (result.code === 'success') {
      console.log('密钥列表:', result.data);
      console.log('分页信息:', result.pagination);
    } else {
      console.error('获取密钥列表失败:', result.message);
    }
  })
  .catch(error => {
    console.error('API请求失败:', error);
  });
```

## 错误处理

所有API接口返回的错误格式统一如下：

```json
{
  "code": "error_code",
  "code_en": "ERROR_CODE",
  "message": "错误描述",
  "doc": "错误文档链接(可选)",
  "data": null
}
```

常见错误码：
- `INVALID_REQUEST`: 请求参数无效
- `AUTH_FAILED`: 认证失败
- `NOT_FOUND`: 资源不存在
- `INTERNAL_ERROR`: 内部服务器错误
- `DUPLICATE_NAME`: 名称重复

## 注意事项

1. 所有API请求需要在请求头中携带JWT令牌进行认证
2. 密钥值(Value)字段根据不同的密钥类型，结构会有所不同
3. 建议使用密钥模板来确保密钥格式的正确性
4. 删除密钥操作是不可逆的，请谨慎操作
5. 密钥值在传输和存储过程中会进行加密处理
6. 分页查询时，请合理设置page_size参数，避免请求过多数据

## 联系信息

如果您在使用API过程中遇到问题，请联系系统管理员或技术支持团队。