import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate, validateSchema } from '../utils';
import type { Schema } from '../utils';
import { api } from '../../api/client';

/**
 * Browser implementation of HTTP Node Runner
 * Uses fetch API with fallback to server proxy for CORS issues
 */
export class HttpNodeRunnerBrowser implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const logs: string[] = [];

        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        log(`Interpolating parameters...`);
        const params = interpolate(node.parameters, context, node);

        if (node.type === 'webhook') {
            // Webhook in browser is just a simulation trigger
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
            // Normalize method
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
            const method = params.method || 'GET';
            const headers = params.headers || {};
            const body = params.body;

            log(`Request: ${method} ${url}`);
            log(`Environment: browser`);

            const startTime = Date.now();

            // Try direct fetch first (fast but subject to CORS)
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch(url, {
                    method,
                    headers,
                    body: method !== 'GET' && method !== 'HEAD' && body
                        ? (typeof body === 'string' ? body : JSON.stringify(body))
                        : undefined,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const duration = Date.now() - startTime;
                log(`Response Status: ${response.status} ${response.statusText} (${duration}ms)`);

                const contentType = response.headers.get('content-type');
                let responseData: any;

                if (contentType?.includes('application/json')) {
                    try {
                        responseData = await response.json();
                    } catch {
                        responseData = await response.text();
                    }
                } else {
                    responseData = await response.text();
                }

                const respHeaders: Record<string, string> = {};
                response.headers.forEach((val, key) => {
                    respHeaders[key] = val;
                });

                log(`Request completed successfully.`);

                return {
                    status: response.ok ? 'success' : 'error',
                    inputs: params,
                    output: {
                        status: response.status,
                        data: responseData,
                        headers: respHeaders
                    },
                    logs,
                    error: !response.ok ? `HTTP Error ${response.status}: ${response.statusText}` : undefined
                };

            } catch (fetchError: any) {
                // CORS or network error - fallback to server proxy
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout');
                }

                log(`Direct fetch failed: ${fetchError.message}. Trying server proxy...`);

                try {
                    const proxyRes = await api.proxyRequest(method, url, headers, body);
                    const duration = Date.now() - startTime;

                    log(`Proxy Response Status: ${proxyRes.status} (${duration}ms)`);

                    return {
                        status: proxyRes.status >= 200 && proxyRes.status < 300 ? 'success' : 'error',
                        inputs: params,
                        output: {
                            status: proxyRes.status,
                            data: proxyRes.data,
                            headers: proxyRes.headers || {}
                        },
                        logs
                    };
                } catch (proxyError: any) {
                    throw new Error(`Server proxy failed: ${proxyError.message}`);
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
