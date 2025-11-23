
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

export class JsNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const code = node.parameters?.code;
    const inputData = interpolate(node.parameters?.input, context);
    
    if (!code) return { status: 'skipped', logs: ['No code provided'] };

    const logs: string[] = [];
    try {
        // Provide a safe-ish execution environment
        const func = new Function('input', 'console', `
            const logs = [];
            const logger = {
                log: (...args) => logs.push(args.join(' ')),
                info: (...args) => logs.push('[INFO] ' + args.join(' ')),
                error: (...args) => logs.push('[ERROR] ' + args.join(' '))
            };
            
            ${code}
            
            // Try to determine entry point or return value
            if (typeof process === 'function') {
                return { result: process(input), logs: logs };
            }
            return { result: null, logs: logs.concat(['No process function found']) };
        `);

        const { result, logs: executionLogs } = func(inputData);
        return {
            status: 'success',
            inputs: { input: inputData },
            output: result,
            logs: executionLogs
        };
    } catch (e: any) {
        return {
            status: 'error',
            inputs: { input: inputData },
            error: e.message,
            logs: [e.message]
        };
    }
  }
}
