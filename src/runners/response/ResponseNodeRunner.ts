import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult, ResponseContext } from '../../core/types';
import { interpolate } from '../utils';

/**
 * Response Node Parameters
 */
export interface ResponseNodeParameters {
  /** Response body - can be object, string, or template expression */
  body?: any;
  /** HTTP status code (default: 200) */
  status_code?: number;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * Response Node Runner
 * 
 * Captures workflow output and writes it to the response context
 * for synchronous trigger responses. This enables request-response
 * patterns for API-style workflows.
 * 
 * Implementation is the same for both browser and server environments.
 */
export class ResponseNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const logs: string[] = [];
    
    const log = (msg: string) => {
      if (context.log) context.log(msg);
      logs.push(msg);
    };

    try {
      log('Processing response node parameters...');
      
      // Interpolate parameters with workflow context
      const params = interpolate(node.parameters || {}, context, node) as ResponseNodeParameters;
      
      // Extract response parameters with defaults
      let body = params.body;
      const statusCode = params.status_code ?? 200;
      const headers = params.headers ?? {};

      log(`Response status code: ${statusCode}`);
      if (headers && Object.keys(headers).length > 0) {
        log(`Response headers: ${JSON.stringify(headers)}`);
      }

      // 如果 body 为字符串且看起来是 JSON，尝试解析为对象，避免被网关作为字符串编码
      if (typeof body === 'string') {
        const trimmed = body.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            body = JSON.parse(trimmed);
            log('Response body parsed from JSON string to object');
          } catch (e: any) {
            log(`Response body JSON parse failed, keep string: ${e.message}`);
          }
        }
      }

      // Build the response context
      const responseData: ResponseContext = {
        body,
        statusCode,
        headers,
        hasResponse: true,
        eventId: context.executionState?.responseContext?.eventId
      };

      // Write to the execution state's response context
      if (context.executionState) {
        context.executionState.responseContext = responseData;
        log('Response context updated successfully');
      } else {
        log('Warning: No execution state available to store response context');
      }

      return {
        status: 'success',
        inputs: params,
        output: {
          body,
          statusCode,
          headers,
          captured: true
        },
        logs
      };

    } catch (e: any) {
      log(`Error in response node: ${e.message}`);
      return {
        status: 'error',
        error: e.message,
        logs
      };
    }
  }
}
