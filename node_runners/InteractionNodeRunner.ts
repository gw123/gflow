

import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult, InputFieldDefinition } from '../types';
import { interpolate } from './utils';

export class InteractionNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context);
    
    // Construct the form configuration from parameters
    const title = params.title || node.name;
    const description = params.description || "Please provide the requested information below.";
    
    // Expect fields to be defined in parameters, or default to a simple text input
    let fields: InputFieldDefinition[] = params.fields;
    
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
        fields = [
            { 
                key: "user_input", 
                label: "Response", 
                type: "text", 
                required: true 
            }
        ];
    }

    if (context.waitForInput) {
        // This will pause the workflow until submitInput is called
        const userInput = await context.waitForInput({
            nodeName: node.name,
            title,
            description,
            fields
        });

        return {
            status: 'success',
            inputs: params,
            output: { ...userInput },
            logs: ['User input received successfully']
        };
    } else {
        return {
            status: 'error',
            error: "Execution context does not support user interaction (waitForInput missing)",
            logs: ["Failed to wait for input"]
        };
    }
  }
}