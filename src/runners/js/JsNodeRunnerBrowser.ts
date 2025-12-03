import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Browser implementation of JavaScript Node Runner
 * Uses Function constructor for code execution
 */
export class JsNodeRunnerBrowser implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const code = node.parameters?.code;
        const inputData = interpolate(node.parameters?.input, context);

        if (!code) return { status: 'skipped', logs: ['No code provided'] };

        const logs: string[] = [];
        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        try {
            log(`Executing JavaScript code (environment: browser)`);

            const startTime = Date.now();

            // Create a function with code execution and logging
            const func = new Function('input', 'console', `
        const logs = [];
        const logger = {
          log: (...args) => logs.push(args.join(' ')),
          info: (...args) => logs.push('[INFO] ' + args.join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.join(' '))
        };
        
        ${code}
        
        // Try to determine entry point
        if (typeof process === 'function') {
          return { result: process(input), logs };
        }
        
        // If no explicit return, return undefined with logs
        return { result: undefined, logs };
      `);

            const { result, logs: executionLogs } = func(inputData, console);

            const duration = Date.now() - startTime;
            log(`Execution completed in ${duration}ms`);

            // Output execution logs
            if (executionLogs && executionLogs.length > 0) {
                executionLogs.forEach((l: string) => log(l));
            }

            return {
                status: 'success',
                inputs: { input: inputData },
                output: result,
                logs
            };
        } catch (e: any) {
            log(`Execution error: ${e.message}`);
            return {
                status: 'error',
                inputs: { input: inputData },
                error: e.message,
                logs
            };
        }
    }
}
