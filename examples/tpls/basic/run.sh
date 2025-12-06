#!/bin/bash
# 基础示例 - Hello World 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 运行 Hello World 示例"
echo ""

# 选择要运行的示例
if [ "$1" = "variable" ] || [ "$1" = "2" ]; then
    "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/variable-passing.yaml"
else
    "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/hello-world.yaml"
fi

echo ""
echo "📝 可用示例:"
echo "  ./run.sh           # 运行 hello-world.yaml"
echo "  ./run.sh variable  # 运行 variable-passing.yaml"
