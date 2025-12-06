#!/bin/bash
# 控制流程示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔀 运行控制流程示例"
echo ""

case "$1" in
    loop|foreach|2)
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/loop-foreach.yaml"
        ;;
    *)
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/if-condition.yaml"
        ;;
esac

echo ""
echo "📝 可用示例:"
echo "  ./run.sh         # 运行 if-condition.yaml"
echo "  ./run.sh loop    # 运行 loop-foreach.yaml"
