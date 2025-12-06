#!/bin/bash
# 定时任务示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "⏰ 运行定时任务示例"
echo ""
echo "⚠️  注意: 定时任务通常由服务器调度执行"
echo "   这里我们直接手动触发一次来测试工作流逻辑"
echo ""

"$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/cron-job.yaml"

echo ""
echo "📝 可用示例:"
echo "  ./run.sh  # 运行 cron-job.yaml"
echo ""
echo "💡 提示: 在实际使用中，定时任务会由服务器按 Cron 表达式自动触发"
echo "   修改 cron-job.yaml 中的 cron 表达式来设置触发时间"
