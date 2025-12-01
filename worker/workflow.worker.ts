
import { WorkflowEngine } from '../core/WorkflowEngine';
import { Registry } from '../registry';
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../core/types';
import '../builtins'; // Load all plugins into Registry
import { MainMessage, WorkerMessage } from './types';
import { evaluateCondition } from '../node_runners/utils';

// Define nodes that MUST run on the main thread (UI/DOM dependent)
const UI_NODE_TYPES = new Set(['media_capture', 'play_media', 'ai_image_gen']);

let engine: WorkflowEngine | null = null;
let uiResolvers: Record<string, (result: Partial<NodeExecutionResult>) => void> = {};

// --- Proxy Runner for UI Nodes ---
class ProxyRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        // Send request to main thread
        // We pass a simplified context (inputs/global) so the main thread runner can interpolate
        postMessage({
            type: 'REQUEST_UI_EXECUTION',
            node,
            contextData: {
                inputs: context.inputs,
                global: context.global
            }
        } as WorkerMessage);

        // Wait for result from main thread
        return new Promise((resolve) => {
            uiResolvers[node.name] = resolve;
        });
    }
}

const proxyRunner = new ProxyRunner();

// --- Message Handler ---
self.onmessage = (e: MessageEvent<MainMessage>) => {
    const msg = e.data;

    switch (msg.type) {
        case 'INIT':
            engine = new WorkflowEngine(
                msg.workflow,
                {
                    onUpdate: (state) => postMessage({ type: 'STATE_UPDATE', state } as WorkerMessage),
                    getRunner: (type) => {
                        if (UI_NODE_TYPES.has(type)) {
                            return proxyRunner;
                        }
                        return Registry.getRunner(type);
                    },
                    evaluateCondition: (condition, context) => {
                        // Use imported evaluateCondition
                        return evaluateCondition(condition, context);
                    }
                },
                msg.initialState
            );
            break;

        case 'EXECUTE':
            if (engine) engine.execute(msg.mode);
            break;

        case 'NEXT_STEP':
            if (engine) engine.nextStep();
            break;

        case 'RESUME':
            if (engine) engine.resume();
            break;

        case 'SUBMIT_INPUT':
            if (engine) engine.submitInput(msg.data);
            break;

        case 'UI_NODE_RESULT':
            const resolve = uiResolvers[msg.nodeName];
            if (resolve) {
                delete uiResolvers[msg.nodeName];
                resolve(msg.result);
            }
            break;
    }
};
