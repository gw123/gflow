#!/bin/bash
# gFlow 工作流执行辅助脚本
# 将 YAML 工作流转换为 JSON 并发送到服务器执行

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
SERVER_URL="${GFLOW_SERVER:-http://localhost:3001}"

# 打印带颜色的消息
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 检查依赖
check_dependencies() {
    if ! command -v python3 &> /dev/null; then
        log_error "python3 is required but not installed"
        exit 1
    fi
    
    if ! python3 -c "import yaml" 2>/dev/null; then
        log_warn "PyYAML not installed, installing..."
        pip3 install pyyaml
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
}

# 将 YAML 转换为 JSON
yaml_to_json() {
    local yaml_file="$1"
    python3 -c "
import sys
import yaml
import json

with open('$yaml_file', 'r') as f:
    data = yaml.safe_load(f)
    print(json.dumps(data))
"
}

# 执行工作流
run_workflow() {
    local yaml_file="$1"
    local workflow_name=$(basename "$yaml_file" .yaml)
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  gFlow 工作流测试: ${workflow_name}${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    log_info "YAML 文件: $yaml_file"
    log_info "服务器地址: $SERVER_URL"
    echo ""
    
    # 检查文件是否存在
    if [ ! -f "$yaml_file" ]; then
        log_error "文件不存在: $yaml_file"
        exit 1
    fi
    
    # 检查服务器是否运行
    log_info "检查服务器状态..."
    if ! curl -s "$SERVER_URL/api/plugins" > /dev/null 2>&1; then
        log_error "无法连接到服务器 $SERVER_URL"
        log_warn "请确保服务器正在运行: npm run dev:server"
        exit 1
    fi
    log_success "服务器连接正常"
    echo ""
    
    # 转换 YAML 到 JSON
    log_info "转换 YAML 到 JSON..."
    local workflow_json=$(yaml_to_json "$yaml_file")
    
    if [ -z "$workflow_json" ]; then
        log_error "YAML 转换失败"
        exit 1
    fi
    
    # 发送执行请求
    log_info "发送执行请求..."
    echo ""
    echo -e "${YELLOW}────────────────── 执行日志 ──────────────────${NC}"
    echo ""
    
    local response=$(curl -s -X POST "$SERVER_URL/api/execute" \
        -H "Content-Type: application/json" \
        -d "{\"workflow\": $workflow_json}")
    
    echo ""
    echo -e "${YELLOW}────────────────── 执行结果 ──────────────────${NC}"
    echo ""
    
    # 格式化输出
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    
    # 检查执行结果
    if echo "$response" | grep -q '"status": "error"'; then
        log_error "工作流执行失败"
        exit 1
    else
        log_success "工作流执行完成"
    fi
}

# 显示帮助
show_help() {
    echo "用法: $0 <workflow.yaml>"
    echo ""
    echo "示例:"
    echo "  $0 hello-world.yaml"
    echo "  $0 ./examples/tpls/basic/hello-world.yaml"
    echo ""
    echo "环境变量:"
    echo "  GFLOW_SERVER  服务器地址 (默认: http://localhost:3001)"
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    check_dependencies
    run_workflow "$1"
}

main "$@"
