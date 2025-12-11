import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Server implementation of JavaScript Node Runner
 * Uses Node.js vm module for secure code execution
 */
export class JsNodeRunnerServer implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const code = node.parameters?.code;
        const inputData = interpolate(node.parameters?.input, context, node);

        if (!code) return { status: 'skipped', logs: ['No code provided'] };

        const logs: string[] = [];
        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        try {
            log(`Executing JavaScript code (environment: server)`);

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
                        log(msg);
                    },
                    error: (...args: any[]) => {
                        const msg = '[ERROR] ' + args.join(' ');
                        executionLogs.push(msg);
                        log(msg);
                    },
                    info: (...args: any[]) => {
                        const msg = '[INFO] ' + args.join(' ');
                        executionLogs.push(msg);
                        log(msg);
                    },
                    warn: (...args: any[]) => {
                        const msg = '[WARN] ' + args.join(' ');
                        executionLogs.push(msg);
                        log(msg);
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
