
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

export class HttpNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const logs: string[] = [];
    
    // Interpolate parameters
    const params = interpolate(node.parameters, context);
    
    if (node.type === 'webhook') {
        // Webhook in Client Side is just a simulation trigger
        logs.push(`Webhook Triggered: ${params.httpMethod || 'POST'} ${params.path || '/'}`);
        return {
            status: 'success',
            inputs: params,
            output: { 
                headers: { 'content-type': 'application/json' },
                body: params.exportBody || { received: true },
                query: params.exportQuery || {}
            },
            logs
        };
    }

    // Standard HTTP Request
    try {
        const url = params.url;
        const method = params.method || 'GET';
        const headers = params.headers || {};
        const body = params.body ? (typeof params.body === 'string' ? params.body : JSON.stringify(params.body)) : undefined;

        if (!url) throw new Error("URL is required");

        logs.push(`Request: ${method} ${url}`);
        
        const response = await fetch(url, {
            method,
            headers,
            body: method !== 'GET' && method !== 'HEAD' ? body : undefined
        });

        const contentType = response.headers.get('content-type');
        let responseData;
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        logs.push(`Response Status: ${response.status}`);
        
        return {
            status: response.ok ? 'success' : 'error',
            inputs: params,
            output: {
                status: response.status,
                data: responseData,
                headers: Object.fromEntries(response.headers.entries())
            },
            logs
        };
    } catch (e: any) {
        logs.push(`Error: ${e.message}`);
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs
        };
    }
  }
}
