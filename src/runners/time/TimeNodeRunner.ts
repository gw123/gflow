import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Time Node Runner
 * 
 * Handles timer triggers and wait nodes.
 * Implementation is the same for both browser and server environments.
 */
export class TimeNodeRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context, node);

        if (node.type === 'timer') {
            // Timer acts as a trigger, pass parameters to downstream nodes
            return {
                status: 'success',
                inputs: params,
                output: {
                    ...params,  // Include all trigger parameters in output
                    triggeredAt: new Date().toISOString()
                },
                logs: [`Timer triggered interval: ${params.secondsInterval || 0}s`]
            };
        }

        // Wait Node
        const seconds = Number(params.seconds) || 1;
        const ms = seconds * 1000;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'success',
                    inputs: params,
                    output: { waited: seconds, completedAt: new Date().toISOString() },
                    logs: [`Waited for ${seconds} seconds`]
                });
            }, ms);
        });
    }
}
