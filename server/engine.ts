
import axios from 'axios';
import { VM } from 'vm2';
import { WorkflowEngine as CoreEngine } from '../core/WorkflowEngine';
import { WorkflowDefinition, NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../core/types';

/**
 * Server-Side Node Runner Implementations
 * These replace the browser-specific runners.
 */

// --- Utils Adapter ---
const safeEval = (code: string, context: any) => {
    try {
        const vm = new VM({
            timeout: 1000,
            sandbox: { 
                $P: context.inputs?.['$P'] || {},
                $global: context.global || {},
                $inputs: context.inputs || {}
            }
        });
        // Handle n8n style expressions
        const expr = code.startsWith('=') ? code.slice(1) : code;
        return vm.run(expr);
    } catch (e) {
        return undefined; // Fail silently or return raw
    }
};

const interpolate = (template: any, context: any): any => {
    if (typeof template === 'string') {
        const raw = template.trim();
        if (raw.includes('{{')) {
            return raw.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
                const res = safeEval(expr, context);
                return typeof res === 'object' ? JSON.stringify(res) : String(res ?? "");
            });
        }
        if (raw.startsWith('=')) {
            const res = safeEval(raw, context);
            return res !== undefined ? res : raw;
        }
        return template;
    } else if (typeof template === 'object' && template !== null) {
        if (Array.isArray(template)) return template.map(i => interpolate(i, context));
        const res: any = {};
        for (const key in template) res[key] = interpolate(template[key], context);
        return res;
    }
    return template;
};

// --- Runners ---

class ServerHttpRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context);
        if (!params.url) return { status: 'skipped', output: { error: "No URL" }, logs: ["Missing URL"] };
        
        context.log(`HTTP ${params.method || 'GET'} ${params.url}`);
        try {
            const resp = await axios({
                method: params.method || 'GET',
                url: params.url,
                headers: params.headers,
                data: params.body
            });
            return {
                status: 'success',
                inputs: params,
                output: { status: resp.status, data: resp.data, headers: resp.headers },
                logs: [`Status: ${resp.status}`]
            };
        } catch (e: any) {
            return { status: 'error', error: e.message, logs: [`Request failed: ${e.message}`] };
        }
    }
}

class ServerJsRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context);
        const code = params.code || "";
        const input = params.input || context.inputs;
        
        try {
            const vm = new VM({
                timeout: 2000,
                sandbox: { input, console: { log: (m:any) => context.log(String(m)) } }
            });
            const script = `(function(){ ${code} })()`;
            const result = vm.run(script);
            return { status: 'success', inputs: params, output: result, logs: ["Script executed"] };
        } catch (e: any) {
            return { status: 'error', error: e.message, logs: [e.message] };
        }
    }
}

class ServerDefaultRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        // Simple pass-through or simulated wait
        const params = interpolate(node.parameters, context);
        if (node.type === 'wait') {
            await new Promise(r => setTimeout(r, (Number(params.seconds) || 1) * 1000));
        }
        return { status: 'success', inputs: params, output: params, logs: [`Executed ${node.type}`] };
    }
}

// --- Factory ---

const getRunner = (type: string): NodeRunner => {
    switch (type) {
        case 'http': 
        case 'webhook': return new ServerHttpRunner();
        case 'js': return new ServerJsRunner();
        default: return new ServerDefaultRunner();
    }
};

/**
 * Server Workflow Engine Wrapper
 */
export class ServerWorkflowEngine {
    private engine: CoreEngine;

    constructor(workflow: WorkflowDefinition) {
        this.engine = new CoreEngine(
            workflow,
            {
                onUpdate: (state) => { /* Optional: stream state via socket? */ },
                getRunner: getRunner,
                evaluateCondition: (cond, ctx) => {
                    // Reuse safeEval for conditions
                    const res = safeEval(String(cond).replace(/^{{|}}$/g, ''), ctx);
                    return !!res;
                }
            }
        );
    }

    async run() {
        await this.engine.execute('run');
        return {
            results: this.engine.state.nodeResults,
            logs: this.engine.state.logs
        };
    }
}
