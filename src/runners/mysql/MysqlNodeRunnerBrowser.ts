import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Browser implementation of MySQL Node Runner
 * MySQL connections cannot be made directly from the browser,
 * so this returns an informative error.
 */
export class MysqlNodeRunnerBrowser implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const logs: string[] = [];

        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        log(`[MySQL] Interpolating parameters...`);
        const params = interpolate(node.parameters, context);

        log(`[MySQL] Browser environment detected`);
        log(`[MySQL] Direct MySQL connections are not supported in browser`);
        log(`[MySQL] This node will be executed on the server`);

        // In browser, we need to indicate this should run on server
        // The workflow engine should route this to server execution
        return {
            status: 'error',
            inputs: {
                ...params,
                password: '***' // Hide password
            },
            error: 'MySQL connections are not supported in browser. Please execute this workflow on the server.',
            logs
        };
    }
}
