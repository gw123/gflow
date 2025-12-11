import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Default Runner
 * 
 * Default implementation for nodes that don't have a specific runner. 
 * Implementation is the same for both browser and server environments.
 */
export class DefaultRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Interpolate all parameters to show what the node actually received
        const params = interpolate(node.parameters, context, node);
        
        return {
            status: 'success',
            inputs: params,
            output: {
                ...params,
                mocked: true,
                nodeType: node.type,
                processedParams: params
            },
            logs: [`Executed ${node.type} node successfully (Simulated)`]
        };
    }
}