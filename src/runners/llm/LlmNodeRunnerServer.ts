import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { glog } from '../../core/Logger';

// Mock Langfuse Web SDK to avoid fs dependency issues
const logger = glog.defaultLogger().named('LangfuseMock');

class LangfuseWebMock {
    constructor(config: any) {
        logger.info("Initialized with", { config });
    }
    trace(config: any) {
        logger.info("Trace started", { config });
        return new LangfuseTraceMock();
    }
}

class LangfuseTraceMock {
    id = "mock-trace-" + Date.now();
    update(data: any) {
        logger.info("Trace updated", { data });
    }
    generation(data: any) {
        logger.info("Generation started", { data });
        return new LangfuseSpanMock();
    }
    span(data: any) {
        logger.info("Span started", { data });
        return new LangfuseSpanMock();
    }
}

class LangfuseSpanMock {
    end(data: any) {
        logger.info("Span/Generation ended", { data });
    }
}

/**
 * LangChain Node Runner (Server Implementation)
 * 
 * Simulates LangChain agent execution using Google Gemini API in server environment.
 */
export class LlmNodeRunnerServer implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const { log } = context;
        const params = interpolate(node.parameters, context, node);
        const logs: string[] = [];

        // --- 1. Extract Config & Credentials ---
        const goal = params.goal || "Perform a task";
        const tools = params.tools || [];
        const temperature = params.temperature || 0.2;

        // Resolve Credentials
        // We look for them in node.credentials (direct) or params (interpolated)
        const langfuseCreds = node.credentials?.langfuse_keys || node.credentials || {};
        // Fallback to interpolated keys if mapped via Secrets Manager
        const publicKey = langfuseCreds.publicKey || params.LANGFUSE_PUBLIC_KEY;
        const secretKey = langfuseCreds.secretKey || params.LANGFUSE_SECRET_KEY;
        const baseUrl = langfuseCreds.baseUrl || params.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

        // --- 2. Initialize Langfuse (if keys present) ---
        let langfuse: any = null;
        let trace: any = null;

        if (publicKey) {
            try {
                log("[Langfuse] Initializing observability...");
                // Use Mock implementation for browser environment compatibility
                langfuse = new LangfuseWebMock({
                    publicKey,
                    baseUrl
                });

                trace = langfuse.trace({
                    name: `Agent: ${node.name}`,
                    sessionId: `session-${Date.now()}`,
                    metadata: {
                        nodeType: node.type,
                        tools: tools
                    }
                });
                log("[Langfuse] Trace started: " + trace.id);
            } catch (e) {
                log(`[Langfuse] Warning: Failed to init. ${e}`);
            }
        }

        // --- 3. Execute Agent Loop (ReAct Simulation using Gemini) ---
        try {
            log(`[Agent] Goal: "${goal}"`);
            if (trace) trace.update({ input: goal });

            // Step 1: Planning / Thought
            const systemPrompt = `
                You are a smart AI Agent.
                Goal: ${goal}
                Available Tools: ${JSON.stringify(tools)}
                
                Format your response as JSON:
                {
                    "thought": "your reasoning",
                    "action": "tool_name_or_final_answer",
                    "action_input": "arguments"
                }
            `;

            // Get API key from environment variables (server-specific)
            const apiKey = process.env.API_KEY || params.API_KEY;
            if (!apiKey) {
                throw new Error("Google API Key missing in environment");
            }

            const ai = new GoogleGenAI({ apiKey });

            let generationSpan;
            if (trace) {
                generationSpan = trace.generation({
                    name: "Agent Planning",
                    model: "gemini-2.5-flash",
                    input: systemPrompt
                });
            }

            log("[Agent] Thinking...");
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: systemPrompt }] },
                config: {
                    responseMimeType: "application/json",
                    temperature: temperature
                }
            });

            const responseText = result.text || "{}";
            log(`[Agent] Response: ${responseText}`);

            if (generationSpan) {
                generationSpan.end({
                    output: responseText,
                    level: "DEFAULT"
                });
            }

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                parsed = { thought: "Failed to parse JSON", action: "final_answer", action_input: responseText };
            }

            // --- 4. Tool Execution Simulation ---
            let finalResult = parsed.action_input;

            if (parsed.action && parsed.action !== "final_answer") {
                log(`[Agent] Invoking Tool: ${parsed.action}`);

                // Span for tool
                let toolSpan;
                if (trace) {
                    toolSpan = trace.span({
                        name: `Tool: ${parsed.action}`,
                        input: parsed.action_input
                    });
                }

                // Simulate tool execution
                await new Promise(r => setTimeout(r, 800));
                const toolOutput = `Executed ${parsed.action} with ${parsed.action_input}. Result: [Simulated Success]`;

                log(`[Agent] Tool Output: ${toolOutput}`);
                finalResult = toolOutput;

                if (toolSpan) {
                    toolSpan.end({ output: toolOutput });
                }
            }

            if (trace) {
                trace.update({ output: finalResult });
            }

            return {
                status: 'success',
                inputs: params,
                output: {
                    result: finalResult,
                    traceId: trace?.id,
                    thought: parsed.thought
                },
                logs: logs
            };

        } catch (e: any) {
            if (trace) {
                trace.update({ level: "ERROR", statusMessage: e.message });
            }
            return {
                status: 'error',
                inputs: params,
                error: e.message,
                logs: logs.concat([`Error: ${e.message}`])
            };
        }
    }
}