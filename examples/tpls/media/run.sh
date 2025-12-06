#!/bin/bash
# 媒体处理示例 - 运行脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🎵 运行媒体处理示例"
echo ""
echo "⚠️  注意: 媒体采集可能需要麦克风权限"
echo ""

"$TPLS_DIR/run-workflow.sh" "$SCRIPT_DIR/audio-capture.yaml"

echo ""
echo "📝 可用示例:"
echo "  ./run.sh  # 运行 audio-capture.yaml"
echo ""
echo "💡 提示: 服务器端需要安装 FFmpeg 才能进行音频处理"
