
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';

export class ManualNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    // Manual Trigger usually takes no input, but we treat parameters as configuration inputs
    return {
      status: 'success',
      inputs: node.parameters, 
      output: { triggeredAt: new Date().toISOString(), ...node.parameters },
      logs: ['Manual trigger executed']
    };
  }
}
