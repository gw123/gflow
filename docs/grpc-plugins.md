# gRPC 插件系统

gFlow 支持通过 gRPC 协议集成外部插件，让你可以用任何语言（Python、Go、Rust 等）编写节点逻辑。

## 快速开始

### 1. 配置插件

编辑 `config/plugins.yaml` 文件，添加你的插件配置：

```yaml
plugins:
  - name: "My Python Plugin"
    kind: "my_python_plugin"        # 节点类型标识，在工作流中使用
    endpoint: "localhost:50051"     # gRPC 服务端点
    enabled: true
    health_check: true
    description: "我的 Python 插件"
    version: "1.0.0"
    category: "action"              # 可选：trigger, action, ai, control, system, data, human, plugin
    icon: "Plug"                    # Lucide 图标名称
    color: "green"                  # 主题颜色
```

### 2. 实现插件服务

你的插件需要实现 `proto/node_plugin.proto` 中定义的 `NodePluginService` 接口：

```protobuf
service NodePluginService {
  rpc GetMetadata(GetMetadataRequest) returns (GetMetadataResponse);
  rpc Init(InitRequest) returns (InitResponse);
  rpc Run(RunRequest) returns (stream RunResponse);
  rpc Stop(StopRequest) returns (StopResponse);
  rpc TestCredential(TestCredentialRequest) returns (TestCredentialResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}
```

### 3. 在工作流中使用

注册的插件会像内置节点一样出现在节点面板中，可以直接拖拽使用：

```yaml
name: "My Workflow"
nodes:
  - name: "Start"
    type: "manual"
    parameters: {}
    
  - name: "Call Plugin"
    type: "my_python_plugin"           # 使用配置中的 kind
    parameters:
      param1: "value1"
      param2: "={{ $Start.output }}"   # 支持表达式
      
connections:
  Start:
    - - { node: "Call Plugin" }
```

## 配置选项

### 完整配置示例

```yaml
plugins:
  - name: "LangChain Ollama"
    kind: "langchain_ollama"
    endpoint: "localhost:50052"
    enabled: true
    health_check: true
    description: "基于 LangChain 的本地大模型"
    version: "1.0.0"
    category: "ai"
    icon: "Bot"
    color: "purple"
    
    # 连接配置
    connect_timeout_ms: 5000
    request_timeout_ms: 30000
    max_retries: 3
    
    # TLS 配置（可选）
    tls:
      enabled: false
      cert_path: "/path/to/cert.pem"
      key_path: "/path/to/key.pem"
      ca_path: "/path/to/ca.pem"
    
    # 凭证类型（可选）
    credential_type: "openai"
```

### 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 插件显示名称 |
| `kind` | string | ✅ | 节点类型标识（唯一） |
| `endpoint` | string | ✅ | gRPC 服务地址 (host:port) |
| `enabled` | boolean | ✅ | 是否启用 |
| `health_check` | boolean | ❌ | 是否启用健康检查 (默认: true) |
| `description` | string | ❌ | 插件描述 |
| `version` | string | ❌ | 插件版本 |
| `category` | string | ❌ | 分类 (默认: plugin) |
| `icon` | string | ❌ | 图标 (Lucide icon name) |
| `color` | string | ❌ | 主题颜色 |
| `connect_timeout_ms` | number | ❌ | 连接超时 (毫秒) |
| `request_timeout_ms` | number | ❌ | 请求超时 (毫秒) |
| `max_retries` | number | ❌ | 最大重试次数 |
| `credential_type` | string | ❌ | 需要的凭证类型 |
| `tls` | object | ❌ | TLS 配置 |

## API 接口

### 获取所有插件

```bash
GET /api/plugins
```

响应：
```json
[
  {
    "kind": "my_plugin",
    "name": "My Plugin",
    "endpoint": "localhost:50051",
    "enabled": true,
    "status": "healthy",
    "lastHealthCheck": "2024-01-01T00:00:00Z"
  }
]
```

### 获取单个插件

```bash
GET /api/plugins/:kind
```

### 重新加载配置

```bash
POST /api/plugins/reload
```

### 手动注册插件

```bash
POST /api/plugins
Content-Type: application/json

{
  "name": "Dynamic Plugin",
  "kind": "dynamic_plugin",
  "endpoint": "localhost:50053",
  "enabled": true
}
```

### 卸载插件

```bash
DELETE /api/plugins/:kind
```

### 健康检查

```bash
POST /api/plugins/:kind/health
```

## Python 插件示例

### 安装依赖

```bash
pip install grpcio grpcio-tools
```

### 生成 Python 代码

```bash
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=./plugins/python \
  --grpc_python_out=./plugins/python \
  proto/node_plugin.proto
```

### 实现插件

```python
import grpc
from concurrent import futures
import node_plugin_pb2 as pb
import node_plugin_pb2_grpc as pb_grpc

class MyPluginService(pb_grpc.NodePluginServiceServicer):
    
    def GetMetadata(self, request, context):
        return pb.GetMetadataResponse(
            name="my_plugin",
            display_name="My Plugin",
            description="A sample plugin",
            version="1.0.0",
            category=pb.CATEGORY_ACTION,
            node_type=pb.NODE_TYPE_PROCESSOR,
            input_parameters=[
                pb.ParameterDef(
                    name="prompt",
                    type=pb.PARAM_TYPE_STRING,
                    description="Input prompt",
                    required=True,
                )
            ],
        )
    
    def Init(self, request, context):
        # 初始化逻辑
        return pb.InitResponse(success=True)
    
    def Run(self, request, context):
        # 发送日志
        yield pb.RunResponse(
            type=pb.RESPONSE_TYPE_LOG,
            log=pb.LogPayload(
                level=pb.LOG_LEVEL_INFO,
                message="Processing..."
            )
        )
        
        # 处理逻辑
        prompt = request.parameters.get("prompt")
        result = f"Processed: {prompt.string_value}"
        
        # 发送结果
        yield pb.RunResponse(
            type=pb.RESPONSE_TYPE_RESULT,
            result=pb.ResultPayload(
                output={"result": pb.Value(string_value=result)},
                status=pb.EXECUTION_STATUS_SUCCESS,
            )
        )
    
    def HealthCheck(self, request, context):
        return pb.HealthCheckResponse(
            status=pb.HEALTH_STATUS_HEALTHY,
            message="OK",
            plugin_version="1.0.0",
            protocol_version="2.0.0",
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_NodePluginServiceServicer_to_server(MyPluginService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("Plugin server started on port 50051")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

## Go 插件示例

### 生成 Go 代码

```bash
protoc --go_out=. --go-grpc_out=. proto/node_plugin.proto
```

### 实现插件

```go
package main

import (
    "log"
    "net"
    
    "google.golang.org/grpc"
    pb "github.com/mytoolzone/workflow/proto"
)

type pluginServer struct {
    pb.UnimplementedNodePluginServiceServer
}

func (s *pluginServer) GetMetadata(ctx context.Context, req *pb.GetMetadataRequest) (*pb.GetMetadataResponse, error) {
    return &pb.GetMetadataResponse{
        Name:        "go_plugin",
        DisplayName: "Go Plugin",
        Description: "A Go-based plugin",
        Version:     "1.0.0",
        Category:    pb.NodeCategory_CATEGORY_ACTION,
        NodeType:    pb.NodeType_NODE_TYPE_PROCESSOR,
    }, nil
}

func (s *pluginServer) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
    return &pb.HealthCheckResponse{
        Status:  pb.HealthStatus_HEALTH_STATUS_HEALTHY,
        Message: "OK",
    }, nil
}

func (s *pluginServer) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
    // Send log
    stream.Send(&pb.RunResponse{
        Type: pb.ResponseType_RESPONSE_TYPE_LOG,
        Payload: &pb.RunResponse_Log{
            Log: &pb.LogPayload{
                Level:   pb.LogLevel_LOG_LEVEL_INFO,
                Message: "Processing...",
            },
        },
    })
    
    // Send result
    stream.Send(&pb.RunResponse{
        Type: pb.ResponseType_RESPONSE_TYPE_RESULT,
        Payload: &pb.RunResponse_Result{
            Result: &pb.ResultPayload{
                Output: map[string]*pb.Value{
                    "result": {Kind: &pb.Value_StringValue{StringValue: "Done"}},
                },
                Status: pb.ExecutionStatus_EXECUTION_STATUS_SUCCESS,
            },
        },
    })
    
    return nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterNodePluginServiceServer(s, &pluginServer{})
    log.Println("Plugin server started on port 50051")
    s.Serve(lis)
}
```

## 注意事项

1. **健康检查**: 插件启动后，gFlow 会定期进行健康检查。确保你的 `HealthCheck` 方法正确实现。

2. **流式响应**: `Run` 方法返回流式响应，可以发送多条日志、进度更新，最后发送结果。

3. **错误处理**: 使用 `RESPONSE_TYPE_ERROR` 来返回错误，包含错误码和错误信息。

4. **参数类型**: 所有参数都使用 `Value` 类型包装，支持字符串、数字、布尔值、数组和对象。

5. **凭证管理**: 如果插件需要凭证，在配置中指定 `credential_type`，凭证会在 `Init` 请求中传递。

## 故障排除

### 插件状态为 `unhealthy`

- 检查插件服务是否正在运行
- 检查 endpoint 配置是否正确
- 查看服务器日志中的错误信息

### 连接被拒绝

- 确保插件服务监听的端口与配置一致
- 检查防火墙设置

### 参数传递问题

- 检查 proto 定义是否匹配
- 使用日志输出查看接收到的参数
