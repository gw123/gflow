#!/bin/bash
# AI/LLM 示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🤖 运行 AI/LLM 示例"
echo ""

# 检查 API Key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  警告: OPENAI_API_KEY 环境变量未设置"
    echo "   请设置后再运行: export OPENAI_API_KEY='sk-...'"
    echo ""
fi

case "$1" in
    chain|chaining|2)
        echo "📝 运行提示词链式调用示例..."
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/prompt-chaining.yaml"
        ;;
    *)
        echo "📝 运行 ChatGPT 简单对话示例..."
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/chatgpt-simple.yaml"
        ;;
esac

echo ""
echo "📝 可用示例:"
echo "  ./run.sh         # 运行 chatgpt-simple.yaml"
echo "  ./run.sh chain   # 运行 prompt-chaining.yaml"
echo ""
echo "💡 提示: 需要设置 OPENAI_API_KEY 环境变量"
