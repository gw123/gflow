
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

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

export class LlmNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context);
    const { log } = context;
    
    if (node.type === 'prompt_template') {
        return {
            status: 'success',
            inputs: params,
            output: { 
                result: params.template_id ? `Template ${params.template_id} Rendered` : "Template Rendered",
                ...params 
            },
            logs: ['Template processed']
        };
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

    // --- LLM Execution ---
    const prompt = params.question || params.text || JSON.stringify(params);
    const model = params.model || 'gpt-3.5-turbo';
    
    if (trace) trace.update({ input: prompt });

    let generation;
    if (trace) {
        generation = trace.generation({
            name: "LLM Call",
            model: model,
            input: prompt,
            modelParameters: { temperature: params.temperature || 0.7 }
        });
    }

    await new Promise(r => setTimeout(r, 1500)); // Simulate thinking

    const mockResponse = `[AI Simulation] I received your input: "${prompt}". This is a simulated response from the ${node.type} node.`;

    if (generation) {
        generation.end({
            output: mockResponse,
            usage: { promptTokens: prompt.length, completionTokens: mockResponse.length, totalTokens: prompt.length + mockResponse.length }
        });
    }

    if (trace) {
        trace.update({ output: mockResponse });
    }

    const logs = [
        `Model: ${model}`,
        `Prompt length: ${prompt.length} chars`,
        `Response generated successfully`
    ];
    
    if (trace) logs.push(`Trace ID: ${trace.id}`);

    return {
        status: 'success',
        inputs: params,
        output: {
            result: mockResponse,
            usage: { tokens: prompt.length, cost: 0.001 },
            traceId: trace?.id
        },
        logs
    };
  }
}
