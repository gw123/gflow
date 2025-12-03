import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';
import { GoogleGenAI } from "@google/genai";

// Mock Langfuse Web SDK to avoid fs dependency issues in browser
class LangfuseWebMock {
    constructor(config: any) {
        // console.log("[Langfuse Mock] Initialized with", config);
    }
    trace(config: any) {
        return new LangfuseTraceMock();
    }
}

class LangfuseTraceMock {
    id = "mock-trace-" + Date.now();
    update(data: any) {}
    generation(data: any) {
        return new LangfuseSpanMock();
    }
    span(data: any) {
        return new LangfuseSpanMock();
    }
}

class LangfuseSpanMock {
    end(data: any) {}
}

export class LlmNodeRunnerBrowser implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context);
    const { log } = context;
    
    // 1. Handle Prompt Template (Synchronous)
    if (node.type === 'prompt_template') {
        const template = params.template || "";
        return {
            status: 'success',
            inputs: params,
            output: { 
                result: template, 
                prompt: template,
                ...params 
            },
            logs: ['Template processed']
        };
    }

    // 2. Real LLM Execution (Gemini)
    // Get API key from window.env for browser environment
    const apiKey = (window as any).env?.API_KEY || params.API_KEY;
    if (!apiKey) {
        return { status: 'error', error: "API Key missing. Please check your environment configuration.", logs: ["Missing API_KEY"] };
    }

    // --- Langfuse Init ---
    let langfuse: any = null;
    let trace: any = null;
    
    // Check credentials in node or params (legacy/global)
    const langfuseCreds = node.credentials?.langfuse_keys || node.credentials || {};
    const publicKey = langfuseCreds.publicKey || params.LANGFUSE_PUBLIC_KEY;
    const baseUrl = langfuseCreds.baseUrl || params.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

    if (publicKey) {
        try {
            langfuse = new LangfuseWebMock({ publicKey, baseUrl });
            trace = langfuse.trace({
                name: `LLM: ${node.name}`,
                metadata: { type: node.type, model: params.model }
            });
        } catch (e) {
            if (log) log(`[Langfuse] Init failed: ${e}`);
        }
    }

    // --- Prepare Request ---
    const prompt = params.question || params.text || params.prompt || params.instruction || JSON.stringify(params);
    const model = 'gemini-2.5-flash'; // Standardize on Flash 2.5 for text tasks
    const systemInstruction = params.role || params.system || "You are a helpful assistant.";

    log(`[LLM] Model: ${model}`);
    log(`[LLM] Input: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    if (trace) trace.update({ input: prompt });

    let generation;
    if (trace) {
        generation = trace.generation({
            name: "Gemini Generation",
            model: model,
            input: prompt,
            modelParameters: { temperature: params.temperature || 0.7 }
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: Number(params.temperature) || 0.7,
            }
        });

        const responseText = response.text || "";
        log(`[LLM] Response generated (${responseText.length} chars).`);

        if (generation) {
            generation.end({
                output: responseText,
                usage: { promptTokens: prompt.length, completionTokens: responseText.length, totalTokens: prompt.length + responseText.length } // Approximation
            });
        }

        if (trace) {
            trace.update({ output: responseText });
        }

        const logs = [`Model: ${model}`, `Success`];
        if (trace) logs.push(`Trace ID: ${trace.id}`);

        return {
            status: 'success',
            inputs: params,
            output: {
                result: responseText,
                text: responseText,
                traceId: trace?.id
            },
            logs
        };

    } catch (e: any) {
        log(`[LLM] Error: ${e.message}`);
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: [`API Error: ${e.message}`]
        };
    }
  }
}