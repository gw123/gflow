
import axios from 'axios';
import vm from 'vm';
// Fix: Import from ../src/core because server is at root and core is in src/core
import { WorkflowEngine as CoreEngine } from '../core/WorkflowEngine';
import { WorkflowDefinition, NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../core/types';

/**
 * Server-Side Node Runner Implementations
 * Wraps the CoreEngine with Server-specific Context and Node.js native VM.
 */

// --- Utils Adapter ---

const safeEval = (code: string, context: any) => {
    try {
        // Strip leading '=' if present
        const expr = code.startsWith('=') ? code.slice(1) : code;
        
        // Use Node.js native VM for secure sandbox execution
        const script = new vm.Script(expr);
        const sandbox = { 
            $P: context.inputs?.['$P'] || {},
            $global: context.global || {},
            $inputs: context.inputs || {},
            // Provide safe globals
            console: { log: () => {} },
            Math, JSON, Date, parseInt, parseFloat, String, Number, Boolean, Array, Object
        };
        const vmContext = vm.createContext(sandbox);
        // Timeout prevents infinite loops
        return script.runInContext(vmContext, { timeout: 1000 });
    } catch (e: any) {
        console.error(`[Server Interpolation Error] Failed to evaluate: "${code}"`, e.message);
        return undefined; 
    }
};

const interpolate = (template: any, context: any): any => {
    if (typeof template === 'string') {
        const raw = template.trim();
        // Handle {{ }} interpolation
        if (raw.includes('{{')) {
            return raw.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
                const res = safeEval(expr, context);
                if (typeof res === 'object' && res !== null) return JSON.stringify(res);
                return String(res ?? "");
            });
        }
        // Handle direct expression starting with =
        if (raw.startsWith('=')) {
            const res = safeEval(raw, context);
            return res !== undefined ? res : raw;
        }
        return template;
    } else if (Array.isArray(template)) {
        return template.map(i => interpolate(i, context));
    } else if (typeof template === 'object' && template !== null) {
        const res: any = {};
        for (const key in template) {
            res[key] = interpolate(template[key], context);
        }
        return res;
    }
    return template;
};

// --- Server Specific Runners ---

class ServerHttpRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context);
        if (!params.url) {
            return { status: 'skipped', output: { error: "No URL provided" }, logs: ["Missing URL"] };
        }
        
        context.log(`HTTP ${params.method || 'GET'} ${params.url}`);
        
        try {
            const resp = await axios({
                method: params.method || 'GET',
                url: params.url,
                headers: params.headers,
                data: params.body,
                validateStatus: () => true // Do not throw on 4xx/5xx, let flow handle it
            });
            
            const isError = resp.status >= 400;
            return {
                status: isError ? 'error' : 'success',
                inputs: params,
                output: { 
                    status: resp.status, 
                    data: resp.data, 
                    headers: resp.headers 
                },
                logs: [`Status: ${resp.status} ${resp.statusText}`],
                error: isError ? `HTTP Error ${resp.status}` : undefined
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
            // Using Node's native VM module
            const sandbox = { 
                input, 
                console: { 
                    log: (m:any) => context.log(String(m)),
                    error: (m:any) => context.log(`[Error] ${String(m)}`),
                    info: (m:any) => context.log(`[Info] ${String(m)}`)
                },
                // Add standard globals
                setTimeout, clearTimeout,
                Buffer, Math, JSON, Date, parseInt, parseFloat, String, Number, Boolean, Array, Object
            };
            
            const vmContext = vm.createContext(sandbox);
            
            // Wrap code in an IIFE to allow 'return' statements
            const script = new vm.Script(`
                (function() {
                    ${code}
                })()
            `);
            
            // Execution timeout 5s
            const result = script.runInContext(vmContext, { timeout: 5000 });
            
            return { 
                status: 'success', 
                inputs: params, 
                output: result, 
                logs: ["Script executed successfully"] 
            };
        } catch (e: any) {
            return { 
                status: 'error', 
                error: e.message, 
                logs: [`Runtime Error: ${e.message}`] 
            };
        }
    }
}

class ServerDefaultRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context);
        
        // Handle Wait/Timer logic
        if (node.type === 'wait') {
            const seconds = Number(params.seconds) || 1;
            context.log(`Waiting ${seconds}s...`);
            await new Promise(r => setTimeout(r, seconds * 1000));
            return { 
                status: 'success', 
                inputs: params, 
                output: { waited: seconds }, 
                logs: [`Waited ${seconds}s`] 
            };
        }
        
        // General pass-through for other nodes (Mock execution)
        return { 
            status: 'success', 
            inputs: params, 
            output: { ...params, server_executed: true }, 
            logs: [`Executed ${node.type} (Server Mock)`] 
        };
    }
}

// --- Runner Factory ---

const getRunner = (type: string): NodeRunner => {
    switch (type) {
        case 'http': 
        case 'webhook': return new ServerHttpRunner();
        case 'js': return new ServerJsRunner();
        default: return new ServerDefaultRunner();
    }
};

/**
 * Server Workflow Engine Adapter
 * Exposes a clean API for the Express server to consume.
 */
export class ServerWorkflowEngine {
    private engine: CoreEngine;
    private lastLogCount: number = 0;

    constructor(workflow: WorkflowDefinition) {
        this.engine = new CoreEngine(
            workflow,
            {
                // Engine Callbacks
                onUpdate: (state) => { 
                    // Log new messages to server console
                    if (state.logs.length > this.lastLogCount) {
                        const newLogs = state.logs.slice(this.lastLogCount);
                        newLogs.forEach(l => console.log(`[Workflow: ${workflow.name}] ${l}`));
                        this.lastLogCount = state.logs.length;
                    }
                },
                getRunner: getRunner,
                evaluateCondition: (cond, ctx) => {
                    // Logic: Remove outer {{ }} if present, then safeEval
                    const raw = String(cond).trim();
                    const expr = (raw.startsWith('{{') && raw.endsWith('}}')) 
                        ? raw.slice(2, -2).trim() 
                        : (raw.startsWith('=') ? raw.slice(1).trim() : raw);
                    
                    try {
                        const res = safeEval(expr, ctx);
                        return !!res;
                    } catch {
                        return false;
                    }
                }
            }
        );
    }

    async run() {
        // Execute workflow
        await this.engine.execute('run');
        
        // Return final state
        return {
            results: this.engine.state.nodeResults,
            logs: this.engine.state.logs
        };
    }
}
