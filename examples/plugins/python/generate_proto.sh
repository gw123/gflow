#!/bin/bash
# 生成 Python proto 代码的脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTO_DIR="$SCRIPT_DIR/../../../proto"
OUT_DIR="$SCRIPT_DIR"

echo "🔧 生成 Python gRPC 代码..."
echo "Proto 目录: $PROTO_DIR"
echo "输出目录: $OUT_DIR"

# 检查 grpcio-tools 是否安装
if ! python3 -c "import grpc_tools" 2>/dev/null; then
    echo "❌ grpcio-tools 未安装，正在安装..."
    pip3 install grpcio grpcio-tools
fi

# 生成代码
python3 -m grpc_tools.protoc \
    -I "$PROTO_DIR" \
    --python_out="$OUT_DIR" \
    --grpc_python_out="$OUT_DIR" \
    "$PROTO_DIR/node_plugin.proto"

if [ $? -eq 0 ]; then
    echo "✅ 代码生成成功!"
    echo ""
    echo "生成的文件:"
    ls -la "$OUT_DIR"/*.py 2>/dev/null || echo "  (无 .py 文件)"
    echo ""
    echo "运行插件: python3 echo_plugin.py"
else
    echo "❌ 代码生成失败"
    exit 1
fi
