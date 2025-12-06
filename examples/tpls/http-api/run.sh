#!/bin/bash
# HTTP API 示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🌐 运行 HTTP API 示例"
echo ""

case "$1" in
    webhook|2)
        echo "⚠️  注意: Webhook 示例需要外部触发"
        echo "   可以通过以下命令触发:"
        echo "   curl -X POST http://localhost:3001/webhook/order-notification \\"
        echo "     -H 'Content-Type: application/json' \\"
        echo "     -d '{\"event\": \"order.created\", \"data\": {\"orderId\": \"ORD001\"}}'"
        echo ""
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/webhook-trigger.yaml"
        ;;
    *)
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/rest-api-call.yaml"
        ;;
esac

echo ""
echo "📝 可用示例:"
echo "  ./run.sh           # 运行 rest-api-call.yaml"
echo "  ./run.sh webhook   # 运行 webhook-trigger.yaml"
