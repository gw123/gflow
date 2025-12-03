import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

export class PlayMediaNodeRunnerServer implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    
    // Play media only works in browser environment
    log("Play Media is not supported in server environment (Local Run only)");
    
    return {
      status: 'error',
      inputs: params,
      error: "Play Media node only works in browser environment (Local Run)",
      logs: ["Play Media is not supported in server environment"]
    };
  }
}