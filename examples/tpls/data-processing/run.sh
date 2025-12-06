#!/bin/bash
# 数据处理示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "📊 运行数据处理示例"
echo ""

"$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/json-transform.yaml"

echo ""
echo "📝 可用示例:"
echo "  ./run.sh  # 运行 json-transform.yaml"
