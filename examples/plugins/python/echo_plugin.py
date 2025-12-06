#!/usr/bin/env python3
"""
gFlow 插件示例 - Echo Plugin

这是一个简单的 gRPC 插件示例，用于测试 gFlow 的插件系统。
它接收输入并将其回显。

使用方法:
1. 安装依赖: pip install grpcio grpcio-tools
2. 生成 proto 代码: python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/node_plugin.proto
3. 运行: python echo_plugin.py
"""

import grpc
from concurrent import futures
import time
import json
import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

try:
    import node_plugin_pb2 as pb
    import node_plugin_pb2_grpc as pb_grpc
except ImportError:
    print("请先生成 proto 代码:")
    print("python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/node_plugin.proto")
    sys.exit(1)


def value_to_python(value):
    """将 proto Value 转换为 Python 值"""
    if value is None:
        return None
    
    kind = value.WhichOneof('kind')
    if kind == 'null_value':
        return None
    elif kind == 'string_value':
        return value.string_value
    elif kind == 'int_value':
        return value.int_value
    elif kind == 'double_value':
        return value.double_value
    elif kind == 'bool_value':
        return value.bool_value
    elif kind == 'bytes_value':
        return value.bytes_value
    elif kind == 'list_value':
        return [value_to_python(v) for v in value.list_value.values]
    elif kind == 'map_value':
        return {k: value_to_python(v) for k, v in value.map_value.fields.items()}
    return None


def python_to_value(val):
    """将 Python 值转换为 proto Value"""
    if val is None:
        return pb.Value(null_value=pb.NULL_VALUE)
    elif isinstance(val, str):
        return pb.Value(string_value=val)
    elif isinstance(val, bool):
        return pb.Value(bool_value=val)
    elif isinstance(val, int):
        return pb.Value(int_value=val)
    elif isinstance(val, float):
        return pb.Value(double_value=val)
    elif isinstance(val, bytes):
        return pb.Value(bytes_value=val)
    elif isinstance(val, list):
        return pb.Value(list_value=pb.ListValue(values=[python_to_value(v) for v in val]))
    elif isinstance(val, dict):
        return pb.Value(map_value=pb.MapValue(fields={k: python_to_value(v) for k, v in val.items()}))
    else:
        return pb.Value(string_value=str(val))


class EchoPluginService(pb_grpc.NodePluginServiceServicer):
    """Echo 插件服务实现"""
    
    def GetMetadata(self, request, context):
        """返回插件元数据"""
        return pb.GetMetadataResponse(
            name="echo_plugin",
            display_name="Echo Plugin",
            description="一个简单的回显插件，用于测试",
            version="1.0.0",
            icon="MessageCircle",
            category=pb.CATEGORY_ACTION,
            node_type=pb.NODE_TYPE_PROCESSOR,
            input_parameters=[
                pb.ParameterDef(
                    name="message",
                    display_name="消息",
                    type=pb.PARAM_TYPE_STRING,
                    description="要回显的消息",
                    required=True,
                    default_value=pb.Value(string_value="Hello, World!"),
                    ui_type=pb.UI_TYPE_TEXTAREA,
                ),
                pb.ParameterDef(
                    name="prefix",
                    display_name="前缀",
                    type=pb.PARAM_TYPE_STRING,
                    description="添加到消息前的前缀",
                    required=False,
                    default_value=pb.Value(string_value="[Echo]"),
                    ui_type=pb.UI_TYPE_TEXT,
                ),
                pb.ParameterDef(
                    name="delay",
                    display_name="延迟(秒)",
                    type=pb.PARAM_TYPE_INT,
                    description="处理延迟时间",
                    required=False,
                    default_value=pb.Value(int_value=0),
                    ui_type=pb.UI_TYPE_NUMBER,
                ),
            ],
            output_parameters=[
                pb.ParameterDef(
                    name="result",
                    display_name="结果",
                    type=pb.PARAM_TYPE_STRING,
                    description="回显的消息",
                ),
                pb.ParameterDef(
                    name="timestamp",
                    display_name="时间戳",
                    type=pb.PARAM_TYPE_STRING,
                    description="处理时间戳",
                ),
            ],
            capabilities=pb.PluginCapabilities(
                supports_streaming=True,
                supports_cancel=False,
                supports_retry=True,
                requires_credential=False,
                max_concurrent=10,
                default_timeout_ms=30000,
            ),
        )
    
    def Init(self, request, context):
        """初始化插件"""
        print(f"[Init] Node: {request.node_config.name if request.node_config else 'unknown'}")
        print(f"[Init] Workflow: {request.workflow_config.name if request.workflow_config else 'unknown'}")
        return pb.InitResponse(success=True)
    
    def Run(self, request, context):
        """执行插件逻辑"""
        # 解析参数
        params = {k: value_to_python(v) for k, v in request.parameters.items()}
        message = params.get('message', 'No message provided')
        prefix = params.get('prefix', '[Echo]')
        delay = params.get('delay', 0)
        
        print(f"[Run] Received message: {message}")
        
        # 发送日志
        yield pb.RunResponse(
            type=pb.RESPONSE_TYPE_LOG,
            timestamp_ms=int(time.time() * 1000),
            log=pb.LogPayload(
                level=pb.LOG_LEVEL_INFO,
                message=f"开始处理消息: {message[:50]}...",
            ),
        )
        
        # 模拟处理延迟
        if delay > 0:
            for i in range(delay):
                yield pb.RunResponse(
                    type=pb.RESPONSE_TYPE_PROGRESS,
                    timestamp_ms=int(time.time() * 1000),
                    progress=pb.ProgressPayload(
                        current=i + 1,
                        total=delay,
                        percentage=((i + 1) / delay) * 100,
                        message=f"处理中... {i + 1}/{delay}",
                    ),
                )
                time.sleep(1)
        
        # 生成结果
        result = f"{prefix} {message}"
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        
        yield pb.RunResponse(
            type=pb.RESPONSE_TYPE_LOG,
            timestamp_ms=int(time.time() * 1000),
            log=pb.LogPayload(
                level=pb.LOG_LEVEL_INFO,
                message="处理完成",
            ),
        )
        
        # 发送结果
        yield pb.RunResponse(
            type=pb.RESPONSE_TYPE_RESULT,
            timestamp_ms=int(time.time() * 1000),
            result=pb.ResultPayload(
                output={
                    "result": python_to_value(result),
                    "timestamp": python_to_value(timestamp),
                    "original_message": python_to_value(message),
                    "prefix": python_to_value(prefix),
                },
                branch_index=0,
                status=pb.EXECUTION_STATUS_SUCCESS,
                duration_ms=delay * 1000 if delay else 10,
            ),
        )
    
    def Stop(self, request, context):
        """停止执行"""
        print(f"[Stop] Received stop request: {request.reason}")
        return pb.StopResponse(
            success=True,
            status=pb.STOP_STATUS_STOPPED,
            message="已停止",
        )
    
    def TestCredential(self, request, context):
        """测试凭证"""
        return pb.TestCredentialResponse(
            success=True,
            info={"message": "此插件不需要凭证"},
        )
    
    def HealthCheck(self, request, context):
        """健康检查"""
        return pb.HealthCheckResponse(
            status=pb.HEALTH_STATUS_HEALTHY,
            message="OK",
            plugin_version="1.0.0",
            protocol_version="2.0.0",
            supported_features=["streaming", "retry"],
        )


def serve(port=50051):
    """启动 gRPC 服务"""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),  # 50MB
            ('grpc.max_send_message_length', 50 * 1024 * 1024),     # 50MB
        ],
    )
    pb_grpc.add_NodePluginServiceServicer_to_server(EchoPluginService(), server)
    
    listen_address = f'[::]:{port}'
    server.add_insecure_port(listen_address)
    
    server.start()
    print(f"🚀 Echo Plugin 启动成功!")
    print(f"📡 监听地址: localhost:{port}")
    print(f"📦 插件类型: echo_plugin")
    print("")
    print("在 gFlow 的 config/plugins.yaml 中添加以下配置:")
    print(f"""
plugins:
  - name: "Echo Plugin"
    kind: "echo_plugin"
    endpoint: "localhost:{port}"
    enabled: true
    health_check: true
    description: "回显插件"
    category: "action"
    icon: "MessageCircle"
    color: "blue"
""")
    
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\n👋 正在关闭服务...")
        server.stop(0)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Echo Plugin for gFlow')
    parser.add_argument('--port', type=int, default=50051, help='监听端口 (默认: 50051)')
    args = parser.parse_args()
    
    serve(args.port)
