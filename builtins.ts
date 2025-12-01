
import { Registry } from './registry';
import { NodePlugin } from './types';

// Runners
import { JsNodeRunner } from './node_runners/JsNodeRunner';
import { ManualNodeRunner } from './node_runners/ManualNodeRunner';
import { HttpNodeRunner } from './node_runners/HttpNodeRunner';
import { TimeNodeRunner } from './node_runners/TimeNodeRunner';
import { LlmNodeRunner } from './node_runners/LlmNodeRunner';
import { ControlNodeRunner } from './node_runners/ControlNodeRunner';
import { SystemNodeRunner } from './node_runners/SystemNodeRunner';
import { GrpcNodeRunner } from './node_runners/GrpcNodeRunner';
import { InteractionNodeRunner } from './node_runners/InteractionNodeRunner';
import { MediaNodeRunner } from './node_runners/MediaNodeRunner';
import { PlayMediaNodeRunner } from './node_runners/PlayMediaNodeRunner';
import { AiImageNodeRunner } from './node_runners/AiImageNodeRunner';
import { LangChainNodeRunner } from './node_runners/LangChainNodeRunner';

const plugins: NodePlugin[] = [
    // --- Trigger ---
    {
        type: 'manual',
        category: 'trigger',
        template: {
            name: "Manual",
            type: "manual",
            parameters: { input_example: { key: "value" } },
            global: { start_time: "={{ $P.startTime }}" }
        },
        runner: new ManualNodeRunner(),
        visuals: { icon: 'Play', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' }
    },
    {
        type: 'webhook',
        category: 'trigger',
        template: {
            name: "Webhook",
            type: "webhook",
            parameters: { method: "POST", path: "my-hook" },
            parameterDefinitions: [
                { name: "method", type: "string", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], defaultValue: "POST" },
                { name: "path", type: "string", defaultValue: "my-hook" }
            ]
        },
        runner: new HttpNodeRunner(),
        visuals: { icon: 'Globe', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' }
    },
    {
        type: 'timer',
        category: 'trigger',
        template: {
            name: "Timer",
            type: "timer",
            parameters: { secondsInterval: 60 }
        },
        runner: new TimeNodeRunner(),
        visuals: { icon: 'Clock', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' }
    },
    {
        type: 'media_capture',
        category: 'trigger',
        template: {
            name: "Media Capture",
            type: "media_capture",
            desc: "Captures audio and video from the user's device for a set duration.",
            parameters: { mode: "audio", duration: 5, fps: 1 },
            parameterDefinitions: [
                { name: "mode", type: "string", options: ["audio", "video", "both"], defaultValue: "audio" },
                { name: "duration", type: "number", defaultValue: 5, description: "Capture duration in seconds" },
                { name: "fps", type: "number", defaultValue: 1, description: "Frames per second (video/both mode only)" }
            ]
        },
        runner: new MediaNodeRunner(),
        visuals: { icon: 'Video', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' }
    },

    // --- Action ---
    {
        type: 'http',
        category: 'action',
        template: {
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
        runner: new HttpNodeRunner(),
        visuals: { icon: 'Globe', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }
    },
    {
        type: 'wait',
        category: 'action',
        template: {
            name: "Wait",
            type: "wait",
            parameters: { seconds: 5 }
        },
        runner: new TimeNodeRunner(),
        visuals: { icon: 'Clock', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }
    },
    {
        type: 'js',
        category: 'action',
        template: {
            name: "JavaScript",
            type: "js",
            parameters: { code: "return { result: 'Hello ' + input.name };" }
        },
        runner: new JsNodeRunner(),
        visuals: { icon: 'Code', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' }
    },
    {
        type: 'code_search',
        category: 'action',
        template: {
            name: "Code Search",
            type: "code_search",
            parameters: { query: "search query" }
        },
        runner: new JsNodeRunner(), // Reusing JS runner for now or implement specific
        visuals: { icon: 'Search', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' }
    },
    {
        type: 'play_media',
        category: 'action',
        template: {
            name: "Play Media",
            type: "play_media",
            desc: "Plays audio or video data from variables (e.g. captured frames) or URLs.",
            parameters: { mediaType: "audio", data: "={{ $P.audioData }}" },
            parameterDefinitions: [
                { name: "mediaType", type: "string", options: ["audio", "video"], defaultValue: "audio" },
                { name: "data", type: "string", defaultValue: "={{ $P.audioData }}", description: "URL or Base64 data variable" },
                { name: "fps", type: "number", defaultValue: 2, description: "FPS for video frame playback" }
            ]
        },
        runner: new PlayMediaNodeRunner(),
        visuals: { icon: 'Volume2', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' }
    },

    // --- AI ---
    {
        type: 'langchain_agent',
        category: 'ai',
        template: {
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
        runner: new LangChainNodeRunner(),
        visuals: { icon: 'Workflow', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' }
    },
    {
        type: 'chatgpt',
        category: 'ai',
        template: {
            name: "ChatGPT",
            type: "chatgpt",
            parameters: { model: "gpt-3.5-turbo", prompt: "Hello!" },
            credentials: { openai_api_key: "", langfuse_keys: {} },
            parameterDefinitions: [
                { name: "model", type: "string", options: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"], defaultValue: "gpt-3.5-turbo" },
                { name: "prompt", type: "string", defaultValue: "Hello!" }
            ]
        },
        runner: new LlmNodeRunner(),
        visuals: { icon: 'Bot', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },
    {
        type: 'ai_image_gen',
        category: 'ai',
        template: {
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
        runner: new AiImageNodeRunner(),
        visuals: { icon: 'Image', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },
    {
        type: 'tts',
        category: 'ai',
        template: {
            name: "Text To Speech",
            type: "tts",
            parameters: { text: "Hello world" }
        },
        runner: new LlmNodeRunner(),
        visuals: { icon: 'Bot', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },
    {
        type: 'agent',
        category: 'ai',
        template: {
            name: "Agent",
            type: "agent",
            parameters: { role: "You are a helpful assistant" }
        },
        runner: new LlmNodeRunner(),
        visuals: { icon: 'Bot', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },
    {
        type: 'ai_low_code',
        category: 'ai',
        template: {
            name: "AI Low Code",
            type: "ai_low_code",
            parameters: { instruction: "Create a form" }
        },
        runner: new LlmNodeRunner(),
        visuals: { icon: 'Bot', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },
    {
        type: 'prompt_template',
        category: 'ai',
        template: {
            name: "Prompt Template",
            type: "prompt_template",
            parameters: { template: "Hello {{name}}", name: "World" }
        },
        runner: new LlmNodeRunner(),
        visuals: { icon: 'File', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }
    },

    // --- Control ---
    {
        type: 'if',
        category: 'control',
        template: {
            name: "If Condition",
            type: "if",
            parameters: { condition: "={{ $P.value > 10 }}" }
        },
        runner: new ControlNodeRunner(),
        visuals: { icon: 'GitBranch', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' }
    },
    {
        type: 'switch',
        category: 'control',
        template: {
            name: "Switch",
            type: "switch",
            parameters: { value: "={{ $P.category }}" }
        },
        runner: new ControlNodeRunner(),
        visuals: { icon: 'Shuffle', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' }
    },
    {
        type: 'loop',
        category: 'control',
        template: {
            name: "Loop",
            type: "loop",
            parameters: { items: "={{ $P.items }}" }
        },
        runner: new ControlNodeRunner(),
        visuals: { icon: 'Shuffle', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' }
    },

    // --- System ---
    {
        type: 'execute_command',
        category: 'system',
        template: {
            name: "Execute Command",
            type: "execute_command",
            parameters: { command: "echo 'hello'" }
        },
        runner: new SystemNodeRunner(),
        visuals: { icon: 'Terminal', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' }
    },
    {
        type: 'docker',
        category: 'system',
        template: {
            name: "Docker",
            type: "docker",
            parameters: { image: "alpine", action: "run" },
            parameterDefinitions: [
                { name: "action", type: "string", options: ["run", "stop", "start", "restart", "logs"], defaultValue: "run" },
                { name: "image", type: "string", defaultValue: "alpine" },
                { name: "docker-compose-file", type: "string", defaultValue: "" }
            ]
        },
        runner: new SystemNodeRunner(),
        visuals: { icon: 'Box', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }
    },
    {
        type: 'docker_compose',
        category: 'system',
        template: {
            name: "Docker Compose",
            type: "docker_compose",
            parameters: { file: "docker-compose.yml" }
        },
        runner: new SystemNodeRunner(),
        visuals: { icon: 'Box', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }
    },
    {
        type: 'git',
        category: 'system',
        template: {
            name: "Git",
            type: "git",
            parameters: { action: "clone", repo: "" },
            parameterDefinitions: [
                { name: "action", type: "string", options: ["clone", "pull", "push", "checkout"], defaultValue: "clone" },
                { name: "repo", type: "string", defaultValue: "" }
            ]
        },
        runner: new SystemNodeRunner(),
        visuals: { icon: 'GitBranch', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' }
    },

    // --- Data ---
    {
        type: 'mysql',
        category: 'data',
        template: { name: "MySQL", type: "mysql", parameters: { sql: "SELECT * FROM table" } },
        runner: new SystemNodeRunner(), // Mock
        visuals: { icon: 'Database', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' }
    },
    {
        type: 'pg',
        category: 'data',
        template: { name: "PostgreSQL", type: "pg", parameters: { sql: "SELECT * FROM table" } },
        runner: new SystemNodeRunner(), // Mock
        visuals: { icon: 'Database', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' }
    },
    {
        type: 'redis',
        category: 'data',
        template: { name: "Redis", type: "redis", parameters: { command: "GET key" } },
        runner: new SystemNodeRunner(), // Mock
        visuals: { icon: 'Layers', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' }
    },
    {
        type: 'feishu_bitable',
        category: 'data',
        template: { name: "Feishu Bitable", type: "feishu_bitable", parameters: { app_token: "" } },
        runner: new SystemNodeRunner(), // Mock
        visuals: { icon: 'Database', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' }
    },
    {
        type: 'text2sql',
        category: 'data',
        template: { name: "Text to SQL", type: "text2sql", parameters: { prompt: "Find users" } },
        runner: new LlmNodeRunner(), // Use LLM mock
        visuals: { icon: 'Database', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' }
    },

    // --- Human ---
    {
        type: 'user_interaction',
        category: 'human',
        template: {
            name: "User Form",
            type: "user_interaction",
            parameters: { 
                title: "Approval", 
                fields: [
                    { key: "approved", label: "Approve?", type: "boolean", required: true }
                ] 
            }
        },
        runner: new InteractionNodeRunner(),
        visuals: { icon: 'User', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' }
    },

    // --- Plugin ---
    {
        type: 'grpc_plugin',
        category: 'plugin',
        template: {
            name: "gRPC Plugin",
            type: "grpc_plugin",
            parameters: { endpoint: "localhost:50051" }
        },
        runner: new GrpcNodeRunner(),
        visuals: { icon: 'Plug', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' }
    }
];

// Register all
plugins.forEach(p => Registry.register(p));
