
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

export class DefaultRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Interpolate all parameters to show what the node actually received
    const params = interpolate(node.parameters, context);
    
    return {
      status: 'success',
      inputs: params,
      output: { 
          mocked: true, 
          nodeType: node.type, 
          processedParams: params 
      },
      logs: [`Executed ${node.type} node successfully (Simulated)`]
    };
  }
}
