import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate, validateSchema } from '../utils';
import type { Schema } from '../utils';
import { api } from '../../api/client';

export class HttpNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const logs: string[] = [];
    
    // Helper to log to both context (realtime) and result logs
    const log = (msg: string) => {
        if (context.log) context.log(msg);
        logs.push(msg);
    };

    log(`Interpolating parameters...`);
    const params = interpolate(node.parameters, context);
    
    if (node.type === 'webhook') {
        // Webhook in Client Side is just a simulation trigger
        log(`Webhook Triggered: ${params.httpMethod || 'POST'} ${params.path || '/'}`);
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

        log(`Request: ${method} ${url}`);
        log(`Preparing to send...`);
        
        // Attempt Direct Fetch (Fast, but subject to CORS)
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' && method !== 'HEAD' ? body : undefined
            });

            log(`Response Status: ${response.status} ${response.statusText}`);
            
            const contentType = response.headers.get('content-type');
            let responseData;
            
            log(`Parsing response body (${contentType || 'unknown'})...`);
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                } catch (e) {
                    responseData = await response.text();
                }
            } else {
                responseData = await response.text();
            }

            const respHeaders: Record<string, string> = {};
            response.headers.forEach((val, key) => { respHeaders[key] = val; });

            log(`Request completed successfully.`);

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
        } catch (fetchError: any) {
             // Fallback to Server Proxy if fetch fails (likely CORS or Network)
             log(`Direct fetch failed: ${fetchError.message}. Switching to Server Proxy...`);
             
             try {
                 const proxyRes = await api.proxyRequest(method, url, headers, params.body /* pass raw body param here since proxy handles stringify if needed */);
                 log(`Proxy Response Status: ${proxyRes.status}`);
                 return {
                     status: proxyRes.status >= 200 && proxyRes.status < 300 ? 'success' : 'error',
                     inputs: params,
                     output: {
                         status: proxyRes.status,
                         data: proxyRes.data,
                         headers: proxyRes.headers
                     },
                     logs
                 };
             } catch (proxyError: any) {
                 throw new Error(`Proxy failed: ${proxyError.message}`);
             }
        }

    } catch (e: any) {
        log(`Error: ${e.message}`);
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs
        };
    }
  }
}