#!/bin/bash
# gRPC 插件示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"
GFLOW_ROOT="$(dirname "$(dirname "$TPLS_DIR")")"

echo "🔌 运行 gRPC 插件示例"
echo ""

# 检查 Echo 插件是否运行
check_plugin() {
    local status=$(curl -s http://localhost:3001/api/plugins/echo_plugin 2>/dev/null)
    if echo "$status" | grep -q '"status":"healthy"'; then
        echo "✅ Echo 插件状态: 健康"
        return 0
    else
        echo "❌ Echo 插件状态: 未连接或不健康"
        return 1
    fi
}

# 启动 Echo 插件
start_plugin() {
    echo "🚀 启动 Echo 插件..."
    
    # 检查 proto 文件是否已生成
    if [ ! -f "$GFLOW_ROOT/examples/plugins/python/node_plugin_pb2.py" ]; then
        echo "📦 生成 Proto 文件..."
        cd "$GFLOW_ROOT/examples/plugins/python" && ./generate_proto.sh
    fi
    
    # 启动插件
    cd "$GFLOW_ROOT/examples/plugins/python"
    python3 echo_plugin.py --port 50051 &
    PLUGIN_PID=$!
    echo "   插件 PID: $PLUGIN_PID"
    
    # 等待启动
    sleep 2
    
    # 重新加载插件配置
    echo "🔄 重新加载插件配置..."
    curl -s -X POST http://localhost:3001/api/plugins/reload > /dev/null
    sleep 1
}

echo "🔍 检查 Echo 插件状态..."
if ! check_plugin; then
    echo ""
    read -p "是否自动启动 Echo 插件? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_plugin
        check_plugin
    else
        echo ""
        echo "请手动启动插件:"
        echo "  cd $GFLOW_ROOT/examples/plugins/python"
        echo "  python3 echo_plugin.py --port 50051"
        exit 1
    fi
fi

echo ""

case "$1" in
    custom|2)
        echo "📝 运行自定义插件模板示例..."
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/custom-plugin.yaml"
        ;;
    *)
        echo "📝 运行 Echo 插件示例..."
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/echo-plugin.yaml"
        ;;
esac

echo ""
echo "📝 可用示例:"
echo "  ./run.sh          # 运行 echo-plugin.yaml"
echo "  ./run.sh custom   # 运行 custom-plugin.yaml"
