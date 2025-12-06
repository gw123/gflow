# gRPC 插件示例

本目录包含使用 gRPC 插件的工作流示例。

## 文件说明

### echo-plugin.yaml
Echo 插件调用示例：
- 使用 Python Echo 插件
- 参数传递
- 处理插件响应

### custom-plugin.yaml
自定义插件模板：
- 如何配置自定义 gRPC 插件
- 错误处理
- 超时配置

## 前置条件

### 1. 配置插件

在 `config/plugins.yaml` 中添加插件配置：

```yaml
plugins:
  - name: "Echo Plugin"
    kind: "echo_plugin"
    endpoint: "localhost:50051"
    enabled: true
    health_check: true
```

### 2. 启动插件服务

```bash
# 生成 proto 代码
cd examples/plugins/python
./generate_proto.sh

# 启动 Echo 插件
python3 echo_plugin.py --port 50051
```

### 3. 重启 gFlow 服务器

```bash
npm run dev:server
```

或调用 API 重新加载插件：
```bash
curl -X POST http://localhost:3001/api/plugins/reload
```

## 插件调用说明

gRPC 插件在工作流中的使用方式与内置节点完全一致：

```yaml
nodes:
  - name: "CallPlugin"
    type: "echo_plugin"  # 使用 config/plugins.yaml 中配置的 kind
    parameters:
      message: "Hello!"
      delay: 1
```

## 检查插件状态

```bash
# 获取所有插件状态
curl http://localhost:3001/api/plugins

# 检查单个插件健康状态
curl -X POST http://localhost:3001/api/plugins/echo_plugin/health
```
