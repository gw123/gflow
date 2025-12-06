# 控制流程示例

本目录包含条件分支、循环等控制流程的工作流示例。

## 文件说明

### if-condition.yaml
条件分支示例：
- 使用 `if` 节点进行条件判断
- True/False 分支处理
- 条件表达式语法

### switch-branch.yaml
多分支选择示例：
- 使用 `switch` 节点进行多路选择
- 匹配不同的值执行不同分支
- 默认分支处理

### loop-foreach.yaml
循环处理示例：
- 使用 `loop` 节点遍历数组
- 处理每个元素
- 收集循环结果

## 核心语法

### If 条件节点

```yaml
- name: "CheckCondition"
  type: "if"
  parameters:
    condition: "={{ $P.value > 10 }}"  # 返回 true/false
```

连接方式：
```yaml
connections:
  CheckCondition:
    - - { node: "TrueBranch" }   # 条件为 true 时执行
    - - { node: "FalseBranch" }  # 条件为 false 时执行
```

### Switch 多分支节点

```yaml
- name: "RouteByType"
  type: "switch"
  parameters:
    value: "={{ $P.type }}"
    cases:
      - value: "A"
        output: 0
      - value: "B"
        output: 1
    default: 2
```

### Loop 循环节点

```yaml
- name: "ProcessItems"
  type: "loop"
  parameters:
    items: "={{ $P.items }}"  # 要遍历的数组
```

循环体中可以通过 `$item` 访问当前元素，`$index` 访问索引。
