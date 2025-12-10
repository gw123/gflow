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
        echo "   curl -X POST http://localhost:3001/webhook/order-notification \
     -H 'Content-Type: application/json' \
     -d '{\"event\": \"order.created\", \"data\": {\"orderId\": \"ORD001\"}}'"
        echo ""
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/webhook-trigger.yaml"
        ;;
    gateway|gateway-basic|3)
        echo "⚠️  注意: HTTP Gateway 示例需要外部触发"
        echo "   可以通过以下命令触发:"
        echo "   curl -X POST http://localhost:8080/api/v1/orders \
     -H 'X-API-Key: gateway-secret-123' \
     -H 'Content-Type: application/json' \
     -d '{\"productId\": \"PROD-123\", \"quantity\": 2}'"
        echo ""
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/gateway-trigger.yaml"
        ;;
    gateway-advanced|4)
        echo "⚠️  注意: 高级 HTTP Gateway 示例需要外部触发"
        echo "   可以通过以下命令触发（需要 HMAC 签名）:"
        echo "   curl -X POST http://localhost:8081/api/v2/users \
     -H 'X-Gateway-Timestamp: $(date +%s000)' \
     -H 'X-Gateway-Signature: <generated-signature>' \
     -H 'Content-Type: application/json' \
     -d '{\"name\": \"Test User\", \"email\": \"test@example.com\"}'"
        echo ""
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/gateway-advanced.yaml"
        ;;
    *)
        "$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/rest-api-call.yaml"
        ;;
esac

echo ""
echo "📝 可用示例:"
echo "  ./run.sh                   # 运行 rest-api-call.yaml"
echo "  ./run.sh webhook           # 运行 webhook-trigger.yaml"
echo "  ./run.sh gateway           # 运行 gateway-trigger.yaml"
echo "  ./run.sh gateway-advanced  # 运行 gateway-advanced.yaml"
