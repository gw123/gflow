# AI/LLM 集成示例

本目录包含大语言模型和 AI 相关的工作流示例。

## 文件说明

### chatgpt-simple.yaml
简单的 LLM 对话示例：
- 配置 OpenAI/Azure API
- 发送聊天请求
- 处理 AI 响应

### prompt-chaining.yaml
提示词链式调用示例：
- 多轮对话上下文
- 提示词模板
- AI 输出作为下一个 AI 的输入

### tts-audio.yaml
文本转语音示例：
- 文本处理
- 调用 TTS 服务
- 保存音频文件

## 支持的 AI 模型

### OpenAI
```yaml
- name: "GPT"
  type: "llm"
  parameters:
    provider: "openai"
    model: "gpt-4"
    messages:
      - role: "system"
        content: "You are a helpful assistant."
      - role: "user"
        content: "{{ $P.question }}"
```

### Claude
```yaml
- name: "Claude"
  type: "llm"
  parameters:
    provider: "claude"
    model: "claude-3-opus-20240229"
    messages:
      - role: "user"
        content: "{{ $P.question }}"
```

### Ollama (本地)
```yaml
- name: "LocalLLM"
  type: "llm"
  parameters:
    provider: "ollama"
    model: "llama2"
    endpoint: "http://localhost:11434"
    messages:
      - role: "user"
        content: "{{ $P.question }}"
```

## 凭证配置

在使用 AI 节点前，需要配置相应的凭证：

```yaml
credentials:
  - id: "openai-cred"
    name: "OpenAI API Key"
    type: "openai"
    data:
      apiKey: "sk-..."
      organization: "org-..."  # 可选
```

节点中引用凭证：
```yaml
- name: "GPT"
  type: "llm"
  credential_id: "openai-cred"
  parameters:
    # ...
```
