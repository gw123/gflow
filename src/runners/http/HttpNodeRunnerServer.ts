import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate, validateSchema } from '../utils';
import type { Schema } from '../utils';

/**
 * Server implementation of HTTP Node Runner
 * Uses axios for HTTP requests
 */
export class HttpNodeRunnerServer implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const logs: string[] = [];

        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        log(`Interpolating parameters...`);
        const params = interpolate(node.parameters, context, node);

        if (node.type === 'webhook') {
            // Webhook in server triggers actual workflow
            log(`Webhook Triggered: ${params.httpMethod || 'POST'} ${params.path || '/'}`);
            return {
                status: 'success',
                inputs: params,
                output: {
                    ...params,
                    triggered: true,
                    type: 'webhook',
                    timestamp: new Date().toISOString()
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
            log(`Environment: server`);

            const startTime = Date.now();

            // Dynamically import axios (server-only)
            const axios = (await import('axios')).default;

            const response = await axios({
                method,
                url,
                headers,
                data: body,
                timeout: 30000,
                validateStatus: () => true // Don't throw on error status codes
            });

            const duration = Date.now() - startTime;

            log(`Response Status: ${response.status} ${response.statusText} (${duration}ms)`);

            if (response.data) {
                const dataPreview = typeof response.data === 'object'
                    ? JSON.stringify(response.data).substring(0, 100)
                    : String(response.data).substring(0, 100);
                log(`Response: ${dataPreview}${dataPreview.length >= 100 ? '...' : ''}`);
            }

            log(`Request completed successfully.`);

            return {
                status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
                inputs: params,
                output: {
                    status: response.status,
                    data: response.data,
                    headers: response.headers as Record<string, string>
                },
                logs,
                error: response.status >= 400 ? `HTTP Error ${response.status}: ${response.statusText}` : undefined
            };

        } catch (e: any) {
            log(`Error: ${e.message}`);

            if (e.code === 'ECONNABORTED') {
                return {
                    status: 'error',
                    inputs: params,
                    error: 'Request timeout',
                    logs
                };
            }

            return {
                status: 'error',
                inputs: params,
                error: e.message,
                logs
            };
        }
    }
}
