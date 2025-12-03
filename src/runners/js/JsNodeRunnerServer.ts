import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Server implementation of JavaScript Node Runner
 * Uses Node.js vm module for secure code execution
 */
export class JsNodeRunnerServer implements NodeRunner {
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
            log(`Executing JavaScript code (environment: server)`);

            const startTime = Date.now();

            // Dynamically import vm module (server-only)
            const vm = await import('vm');

            const executionLogs: string[] = [];

            // Create a sandbox with safe globals and logging
            const sandbox = {
                input: inputData,
                console: {
                    log: (...args: any[]) => {
                        const msg = args.join(' ');
                        executionLogs.push(msg);
                    },
                    error: (...args: any[]) => {
                        executionLogs.push('[ERROR] ' + args.join(' '));
                    },
                    info: (...args: any[]) => {
                        executionLogs.push('[INFO] ' + args.join(' '));
                    },
                    warn: (...args: any[]) => {
                        executionLogs.push('[WARN] ' + args.join(' '));
                    }
                },
                // Add standard globals
                Math, JSON, Date,
                parseInt, parseFloat,
                String, Number, Boolean,
                Array, Object,
                setTimeout, clearTimeout,
                Buffer
            };

            // Create VM context
            const vmContext = vm.createContext(sandbox);

            // Wrap code in IIFE to allow return statements
            const script = new vm.Script(`
        (() => {
          ${code}
        })()
      `);

            // Execute with timeout
            const result = script.runInContext(vmContext, {
                timeout: 5000,
                displayErrors: true
            });

            const duration = Date.now() - startTime;
            log(`Execution completed in ${duration}ms`);

            // Output execution logs
            if (executionLogs.length > 0) {
                executionLogs.forEach(l => log(l));
            }

            return {
                status: 'success',
                inputs: { input: inputData },
                output: result,
                logs
            };
        } catch (e: any) {
            // Try to extract line number from error
            let errorMsg = e.message;
            if (e.stack) {
                const lineMatch = e.stack.match(/<anonymous>:(\d+):(\d+)/);
                if (lineMatch) {
                    const line = parseInt(lineMatch[1]) - 2; // Adjust for wrapper
                    errorMsg = `${e.message} (at line ${line})`;
                }
            }

            log(`Execution error: ${errorMsg}`);
            return {
                status: 'error',
                inputs: { input: inputData },
                error: errorMsg,
                logs
            };
        }
    }
}
