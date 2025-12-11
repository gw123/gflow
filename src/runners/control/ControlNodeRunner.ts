import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Control Node Runner
 * 
 * Handles control flow nodes like if, switch, loop, etc.
 * Implementation is the same for both browser and server environments.
 */
export class ControlNodeRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context, node);

        // Handle If/Condition nodes
        if (node.type === 'if' || node.type === 'condition') {
            return {
                status: 'success',
                inputs: params,
                output: { evaluated: true, ...params },
                logs: ['Condition node executed']
            };
        }

        // Handle Switch nodes
        if (node.type === 'switch') {
            return {
                status: 'success',
                inputs: params,
                output: { evaluated: true, value: params.value },
                logs: [`Switch evaluated: ${params.value}`]
            };
        }

        // Handle Loop nodes
        if (node.type === 'loop' || node.type === 'foreach') {
            const items = params.items || params.array || [];
            return {
                status: 'success',
                inputs: params,
                output: { items, count: Array.isArray(items) ? items.length : 0 },
                logs: [`Loop: ${Array.isArray(items) ? items.length : 0} items`]
            };
        }

        // Default pass-through
        return {
            status: 'success',
            inputs: params,
            output: { ...params, executed: true },
            logs: [`Control node ${node.type} executed`]
        };
    }
}
