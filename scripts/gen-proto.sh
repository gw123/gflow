#!/bin/bash

# Proto 代码生成脚本
# 用法: ./scripts/gen-proto.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROTO_DIR="$PROJECT_ROOT/proto"
OUT_DIR="$PROJECT_ROOT/src/generated/proto"

echo "🔧 Proto Code Generator"
echo "========================"
echo "Proto dir: $PROTO_DIR"
echo "Output dir: $OUT_DIR"

# 创建输出目录
mkdir -p "$OUT_DIR"

# 检查 protoc 是否安装
if ! command -v protoc &> /dev/null; then
    echo "❌ protoc 未安装，请先安装 protobuf compiler"
    echo "   macOS: brew install protobuf"
    echo "   Ubuntu: sudo apt install -y protobuf-compiler"
    exit 1
fi

# 检查 ts-proto 是否安装
TS_PROTO_PLUGIN="$PROJECT_ROOT/node_modules/.bin/protoc-gen-ts_proto"
if [ ! -f "$TS_PROTO_PLUGIN" ]; then
    echo "❌ ts-proto 未安装，正在安装..."
    npm install --save-dev ts-proto
fi

echo ""
echo "📦 生成 TypeScript 代码..."

# 生成 TypeScript 代码
protoc \
    --plugin="protoc-gen-ts_proto=$TS_PROTO_PLUGIN" \
    --ts_proto_out="$OUT_DIR" \
    --ts_proto_opt=outputServices=grpc-js \
    --ts_proto_opt=esModuleInterop=true \
    --ts_proto_opt=env=node \
    --ts_proto_opt=useOptionals=messages \
    --ts_proto_opt=exportCommonSymbols=false \
    --ts_proto_opt=snakeToCamel=true \
    -I "$PROTO_DIR" \
    -I "$(brew --prefix)/include" \
    "$PROTO_DIR"/*.proto

echo ""
echo "✅ Proto 代码生成完成！"
echo "   输出目录: $OUT_DIR"
echo ""
echo "📁 生成的文件:"
ls -la "$OUT_DIR"
