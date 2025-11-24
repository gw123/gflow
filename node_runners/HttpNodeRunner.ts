
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate, validateSchema } from './utils';
import type { Schema } from './utils';

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
        // Normalize method if present
        if (params.method && typeof params.method === 'string') {
            params.method = params.method.toUpperCase();
        }

        const httpParamSchema: Schema = {
            type: 'object',
            required: true,
            properties: {
                url: { type: 'string', required: true },
                method: { type: 'string', required: false, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
                headers: { 
                    type: 'object', 
                    required: false,
                    additionalProperties: { type: 'string' } 
                },
                body: { type: 'any', required: false }
            }
        };

        const validationErrors = validateSchema(params, httpParamSchema, 'parameters');
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        const url = params.url;
        let method = params.method || 'GET';
        const headers = params.headers || {};
        const body = params.body ? (typeof params.body === 'string' ? params.body : JSON.stringify(params.body)) : undefined;

        // Additional URL format check (schema handles string type, but not valid URL syntax strictly)
        try {
            new URL(url); // Validates URL format
        } catch (e) {
            throw new Error(`Invalid URL format: ${url}`);
        }

        logs.push(`Request: ${method} ${url}`);
        
        const response = await fetch(url, {
            method,
            headers,
            body: method !== 'GET' && method !== 'HEAD' ? body : undefined
        });

        const contentType = response.headers.get('content-type');
        let responseData;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                responseData = await response.json();
            } catch (e) {
                // If content-type is json but body is not valid json, fallback to text
                responseData = await response.text();
            }
        } else {
            responseData = await response.text();
        }

        logs.push(`Response Status: ${response.status}`);
        
        // Convert headers to plain object safely
        const respHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => { respHeaders[key] = val; });

        return {
            status: response.ok ? 'success' : 'error',
            inputs: params,
            output: {
                status: response.status,
                data: responseData,
                headers: respHeaders
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
