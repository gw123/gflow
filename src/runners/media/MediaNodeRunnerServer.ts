import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

export class MediaNodeRunnerServer implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    
    // Media capture only works in browser environment
    log("Media Capture is not supported in server environment (Local Run only)");
    
    return {
      status: 'error',
      inputs: params,
      error: "Media Capture only works in browser environment (Local Run)",
      logs: ["Media Capture is not supported in server environment"]
    };
  }
}