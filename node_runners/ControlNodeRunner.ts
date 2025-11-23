
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate, evaluateCondition } from './utils';

export class ControlNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context);
    const logs: string[] = [];

    if (node.type === 'if') {
        // The 'If' node in this system seems to evaluate a condition and pass it downstream.
        // The actual branching happens in the 'connections' via 'when' clause.
        // However, we can output the result of the condition to make it easier to use in 'when'.
        
        // If 'condition' param is a string expression, it might have already been interpolated to a boolean or string 'true'/'false'
        const conditionResult = params.condition;
        
        logs.push(`Condition evaluated to: ${conditionResult}`);
        
        return {
            status: 'success',
            inputs: params,
            output: { 
                result: conditionResult,
                ...params 
            },
            logs
        };
    }

    if (node.type === 'switch') {
        const val = params.value;
        logs.push(`Switch value: ${val}`);
        return {
            status: 'success',
            inputs: params,
            output: {
                result: val,
                ...params
            },
            logs
        };
    }
    
    return {
        status: 'success',
        inputs: params,
        output: { ...params },
        logs: ['Control node executed']
    };
  }
}
