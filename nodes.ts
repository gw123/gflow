
import { NodeDefinition } from './types';

export interface TemplateCategory {
  description?: string;
  templates: NodeDefinition[];
}

export const TEMPLATE_LIBRARY: Record<string, TemplateCategory> = {
  trigger: {
    description: "Workflow triggers to start execution",
    templates: [
      {
        name: "Manual",
        type: "manual",
        parameters: { input_example: { key: "value" } },
        global: { start_time: "={{ $P.startTime }}" }
      },
      {
        name: "Webhook",
        type: "webhook",
        parameters: { method: "POST", path: "my-hook" },
        parameterDefinitions: [
            { name: "method", type: "string", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], defaultValue: "POST" },
            { name: "path", type: "string", defaultValue: "my-hook" }
        ]
      },
      {
        name: "Timer",
        type: "timer",
        parameters: { secondsInterval: 60 }
      },
      {
        name: "Media Capture",
        type: "media_capture",
        desc: "Captures audio and video from the user's device for a set duration.",
        parameters: { mode: "audio", duration: 5, fps: 1 },
        parameterDefinitions: [
            { name: "mode", type: "string", options: ["audio", "video", "both"], defaultValue: "audio" },
            { name: "duration", type: "number", defaultValue: 5, description: "Capture duration in seconds" },
            { name: "fps", type: "number", defaultValue: 1, description: "Frames per second (video/both mode only)" }
        ]
      }
    ]
  },
  action: {
    description: "Basic actions and utilities",
    templates: [
      {
        name: "HTTP Request",
        type: "http",
        parameters: { url: "https://api.example.com", method: "GET", headers: {}, body: {} },
        parameterDefinitions: [
            { name: "method", type: "string", options: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], defaultValue: "GET" },
            { name: "url", type: "string", defaultValue: "https://api.example.com" },
            { name: "headers", type: "object", defaultValue: {} },
            { name: "body", type: "object", defaultValue: {} }
        ]
      },
      {
        name: "Wait",
        type: "wait",
        parameters: { seconds: 5 }
      },
      {
        name: "JavaScript",
        type: "js",
        parameters: { code: "return { result: 'Hello ' + input.name };" }
      },
      {
        name: "Code Search",
        type: "code_search",
        parameters: { query: "search query" }
      },
      {
        name: "Play Media",
        type: "play_media",
        desc: "Plays audio or video data from variables (e.g. captured frames) or URLs.",
        parameters: { mediaType: "audio", data: "={{ $P.audioData }}" },
        parameterDefinitions: [
            { name: "mediaType", type: "string", options: ["audio", "video"], defaultValue: "audio" },
            { name: "data", type: "string", defaultValue: "={{ $P.audioData }}", description: "URL or Base64 data variable" },
            { name: "fps", type: "number", defaultValue: 2, description: "FPS for video frame playback" }
        ]
      }
    ]
  },
  ai: {
    description: "Artificial Intelligence nodes",
    templates: [
      {
        name: "LangChain Agent",
        type: "langchain_agent",
        desc: "AI Agent with tool support and Langfuse observability.",
        parameters: { 
            goal: "Summarize the last email and check calendar.", 
            tools: ["search", "calculator", "calendar"], 
            temperature: 0.2
        },
        credentials: { openai_api_key: "", langfuse_keys: {} },
        parameterDefinitions: [
            { name: "goal", type: "string", defaultValue: "Solve a task", description: "The primary objective for the agent" },
            { name: "tools", type: "object", defaultValue: ["search"], description: "Array of tool names enabled for this agent" },
            { name: "temperature", type: "number", defaultValue: 0.2, description: "Model temperature" },
            { name: "maxSteps", type: "number", defaultValue: 5, description: "Maximum reasoning steps" }
        ]
      },
      {
        name: "ChatGPT",
        type: "chatgpt",
        parameters: { model: "gpt-3.5-turbo", prompt: "Hello!" },
        credentials: { openai_api_key: "", langfuse_keys: {} },
        parameterDefinitions: [
            { name: "model", type: "string", options: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"], defaultValue: "gpt-3.5-turbo" },
            { name: "prompt", type: "string", defaultValue: "Hello!" }
        ]
      },
      {
        name: "AI Image Gen",
        type: "ai_image_gen",
        desc: "Generate images using Google's Nano Banana (Gemini Flash Image) model.",
        parameters: { prompt: "A futuristic city with flying cars", aspectRatio: "1:1", outputFormat: "data_uri", download: false },
        parameterDefinitions: [
            { name: "prompt", type: "string", defaultValue: "A futuristic city", description: "Image description" },
            { name: "aspectRatio", type: "string", options: ["1:1", "3:4", "4:3", "9:16", "16:9"], defaultValue: "1:1" },
            { name: "outputFormat", type: "string", options: ["base64", "data_uri"], defaultValue: "data_uri", description: "Output format" },
            { name: "download", type: "boolean", defaultValue: false, description: "Auto-download to device" }
        ]
      },
      {
        name: "Text To Speech",
        type: "tts",
        parameters: { text: "Hello world" }
      },
      {
        name: "Agent",
        type: "agent",
        parameters: { role: "You are a helpful assistant" }
      },
      {
        name: "AI Low Code",
        type: "ai_low_code",
        parameters: { instruction: "Create a form" }
      }
    ]
  },
  control: {
    description: "Flow control logic",
    templates: [
      {
        name: "If Condition",
        type: "if",
        parameters: { condition: "={{ $P.value > 10 }}" }
      },
      {
        name: "Switch",
        type: "switch",
        parameters: { value: "={{ $P.category }}" }
      },
      {
        name: "Loop",
        type: "loop",
        parameters: { items: "={{ $P.items }}" }
      }
    ]
  },
  system: {
    description: "System interactions",
    templates: [
        {
            name: "Execute Command",
            type: "execute_command",
            parameters: { command: "echo 'hello'" }
        },
        {
            name: "Docker",
            type: "docker",
            parameters: { image: "alpine", action: "run" },
            parameterDefinitions: [
                { name: "action", type: "string", options: ["run", "stop", "start", "restart", "logs"], defaultValue: "run" },
                { name: "image", type: "string", defaultValue: "alpine" },
                { name: "docker-compose-file", type: "string", defaultValue: "" }
            ]
        },
        {
            name: "Docker Compose",
            type: "docker_compose",
            parameters: { file: "docker-compose.yml" }
        },
        {
            name: "Git",
            type: "git",
            parameters: { action: "clone", repo: "" },
            parameterDefinitions: [
                { name: "action", type: "string", options: ["clone", "pull", "push", "checkout"], defaultValue: "clone" },
                { name: "repo", type: "string", defaultValue: "" }
            ]
        }
    ]
  },
  data: {
      description: "Database and Storage",
      templates: [
          { name: "MySQL", type: "mysql", parameters: { sql: "SELECT * FROM table" } },
          { name: "PostgreSQL", type: "pg", parameters: { sql: "SELECT * FROM table" } },
          { name: "Redis", type: "redis", parameters: { command: "GET key" } },
          { name: "Feishu Bitable", type: "feishu_bitable", parameters: { app_token: "" } },
          { name: "Text to SQL", type: "text2sql", parameters: { prompt: "Find users" } }
      ]
  },
  human: {
      description: "Human interactions",
      templates: [
          {
              name: "User Form",
              type: "user_interaction",
              parameters: { 
                  title: "Approval", 
                  fields: [
                      { key: "approved", label: "Approve?", type: "boolean", required: true }
                  ] 
              }
          }
      ]
  },
  plugin: {
      description: "External Plugins",
      templates: [
          {
              name: "gRPC Plugin",
              type: "grpc_plugin",
              parameters: { endpoint: "localhost:50051" }
          }
      ]
  }
};

export const NODE_TEMPLATES: Record<string, NodeDefinition> = {};

// Flatten library for easy lookup by type
Object.values(TEMPLATE_LIBRARY).forEach(category => {
  category.templates.forEach(template => {
    NODE_TEMPLATES[template.type] = template;
  });
});
