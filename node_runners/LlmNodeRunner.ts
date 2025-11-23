
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

export class LlmNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context);
    
    if (node.type === 'prompt_template') {
        // Just return the interpolated result, usually used to format strings
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

    // ChatGPT / Agent Simulation
    // In a real app, we would call OpenAI here. For this demo, we mock or give a generic response.
    // If the user actually provided an API Key in credentials, we could try calling it, 
    // but browser-side calls are risky/CORS-prone.
    
    const prompt = params.question || params.text || JSON.stringify(params);
    
    await new Promise(r => setTimeout(r, 1500)); // Simulate thinking

    const mockResponse = `[AI Simulation] I received your input: "${prompt}". This is a simulated response from the ${node.type} node.`;

    return {
        status: 'success',
        inputs: params,
        output: {
            result: mockResponse,
            usage: { tokens: prompt.length, cost: 0.001 }
        },
        logs: [
            `Model: ${params.model || 'gpt-3.5-turbo'}`,
            `Prompt length: ${prompt.length} chars`,
            `Response generated successfully`
        ]
    };
  }
}
