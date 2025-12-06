# 基础工作流示例

这个目录包含最基础的工作流示例，适合初学者了解 gFlow 的基本概念。

## 文件说明

### hello-world.yaml
最简单的工作流，包含：
- Manual 触发器
- JavaScript 节点处理

### variable-passing.yaml
演示节点间数据传递：
- 如何在节点间传递变量
- 表达式语法的使用

## 运行示例

```bash
# 执行 Hello World 工作流
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": '$(cat hello-world.yaml | python3 -c "import sys,yaml,json; print(json.dumps(yaml.safe_load(sys.stdin)))")'
  }'
```

## 核心概念

### 节点类型
- `manual`: 手动触发器，工作流入口
- `js`: JavaScript 代码节点

### 连接方式
```yaml
connections:
  NodeA:
    - - { node: "NodeB" }  # NodeA 完成后执行 NodeB
```

### 变量引用
- `$P`: 父节点（上一个节点）的输出
- `$global`: 全局变量
- `$NodeName.output`: 指定节点的输出
