# 数据处理示例

本目录包含数据转换和数据库操作的工作流示例。

## 文件说明

### json-transform.yaml
JSON 数据转换示例：
- 数据格式转换
- 字段映射
- 数据过滤和聚合

### database-query.yaml
数据库查询示例：
- MySQL 连接配置
- 执行 SQL 查询
- 结果处理

## 数据转换技巧

### 使用 JS 节点转换数据

```yaml
- name: "TransformData"
  type: "js"
  parameters:
    code: |
      const data = input;
      
      // 过滤
      const filtered = data.filter(item => item.active);
      
      // 映射
      const mapped = filtered.map(item => ({
        id: item.id,
        name: item.firstName + ' ' + item.lastName
      }));
      
      // 聚合
      const total = mapped.length;
      
      return { items: mapped, total };
```

### 常用数据操作

```javascript
// 数组操作
const filtered = arr.filter(x => x.value > 10);
const mapped = arr.map(x => x.name);
const reduced = arr.reduce((sum, x) => sum + x.value, 0);
const sorted = arr.sort((a, b) => a.value - b.value);

// 对象操作
const { field1, field2, ...rest } = obj;  // 解构
const merged = { ...obj1, ...obj2 };       // 合并
const keys = Object.keys(obj);
const values = Object.values(obj);
const entries = Object.entries(obj);

// 字符串操作
const upper = str.toUpperCase();
const split = str.split(',');
const joined = arr.join(', ');
const replaced = str.replace(/old/g, 'new');
```

## MySQL 节点配置

```yaml
- name: "Query"
  type: "mysql"
  parameters:
    connection:
      host: "localhost"
      port: 3306
      user: "root"
      password: "${DB_PASSWORD}"
      database: "mydb"
    query: "SELECT * FROM users WHERE status = ?"
    params: ["active"]
```

或使用凭证：

```yaml
credentials:
  - id: "mysql-prod"
    name: "Production DB"
    type: "mysql"
    data:
      host: "db.example.com"
      port: 3306
      user: "app_user"
      password: "secret"
      database: "production"

nodes:
  - name: "Query"
    type: "mysql"
    credential_id: "mysql-prod"
    parameters:
      query: "SELECT * FROM orders LIMIT 10"
```
