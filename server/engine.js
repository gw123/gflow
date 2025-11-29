
const axios = require('axios');
const { VM } = require('vm2');

/**
 * Server Side Workflow Engine
 * Duplicates the logic of the frontend runner but optimized for Node.js environment.
 */
class WorkflowEngine {
    constructor(workflow, globalConfig = {}) {
        this.workflow = workflow;
        this.global = { ...(workflow.global || {}), ...globalConfig };
        this.results = {};
        this.logs = [];
    }

    log(message) {
        const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.logs.push(entry);
        console.log(`[Workflow: ${this.workflow.name}] ${message}`);
    }

    interpolate(template, context) {
        if (typeof template === 'string') {
            const raw = template.trim();
            // Handle Expressions
            if (raw.includes('{{')) {
                return raw.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
                    try {
                        const vm = new VM({
                            timeout: 1000,
                            sandbox: { 
                                $P: context.inputs || {},
                                $global: context.global || {},
                                $inputs: context.inputs || {}
                            }
                        });
                        const res = vm.run(expr.startsWith('=') ? expr.slice(1) : expr);
                        return typeof res === 'object' ? JSON.stringify(res) : String(res);
                    } catch (e) {
                        return "";
                    }
                });
            }
            if (raw.startsWith('=')) {
                 try {
                    const vm = new VM({
                        timeout: 1000,
                        sandbox: { 
                            $P: context.inputs || {},
                            $global: context.global || {},
                            $inputs: context.inputs || {}
                        }
                    });
                    return vm.run(raw.slice(1));
                 } catch(e) { return raw; }
            }
            return template;
        } else if (typeof template === 'object' && template !== null) {
            if (Array.isArray(template)) return template.map(i => this.interpolate(i, context));
            const res = {};
            for (const key in template) res[key] = this.interpolate(template[key], context);
            return res;
        }
        return template;
    }

    async run() {
        this.log("Starting Server Execution...");
        const startNodes = this.workflow.nodes.filter(n => ['manual', 'webhook', 'timer'].includes(n.type));
        
        let queue = startNodes.length > 0 ? startNodes.map(n => n.name) : (this.workflow.nodes.length > 0 ? [this.workflow.nodes[0].name] : []);
        const processed = new Set();
        const nodeInputs = { '$P': {} };

        while (queue.length > 0) {
            const currentName = queue.shift();
            if (processed.has(currentName)) continue;

            const node = this.workflow.nodes.find(n => n.name === currentName);
            if (!node) continue;

            this.log(`Executing Node: ${currentName} (${node.type})`);
            const startTime = Date.now();
            let result = { status: 'success', output: {} };
            
            try {
                const context = { inputs: nodeInputs, global: this.global };
                result = await this.executeNode(node, context);
                
                // Aggregate outputs
                if (result.status === 'success') {
                    nodeInputs[currentName] = result.output;
                    nodeInputs['$P'] = { ...nodeInputs['$P'], ...result.output };
                }
            } catch (e) {
                result = { status: 'error', error: e.message };
                this.log(`Error in ${currentName}: ${e.message}`);
            }

            this.results[currentName] = {
                nodeName: currentName,
                status: result.status,
                startTime,
                endTime: Date.now(),
                output: result.output,
                error: result.error,
                logs: result.logs || [] // Merge node specific logs if any
            };

            if (result.status === 'success') {
                const connections = this.workflow.connections?.[currentName];
                if (connections) {
                    for (const group of connections) {
                        for (const rule of group) {
                            if (processed.has(rule.node)) continue;
                            
                            let shouldRun = true;
                            if (rule.when && rule.when.length > 0) {
                                // Evaluate conditions
                                // For simplicity in this server mock, we assume true or basic eval
                                // Real impl needs the VM logic from interpolate
                                shouldRun = true; // Placeholder for condition logic
                            }

                            if (shouldRun) queue.push(rule.node);
                        }
                    }
                }
            }
            processed.add(currentName);
        }

        this.log("Execution Finished.");
        return {
            results: this.results,
            logs: this.logs
        };
    }

    async executeNode(node, context) {
        const params = this.interpolate(node.parameters || {}, context);
        
        // --- HTTP / Webhook ---
        if (node.type === 'http' || node.type === 'webhook') {
            if (!params.url) return { status: 'success', output: { mocked: true } }; // Fallback
            try {
                const resp = await axios({
                    method: params.method || 'GET',
                    url: params.url,
                    headers: params.headers,
                    data: params.body
                });
                return { status: 'success', output: { data: resp.data, status: resp.status } };
            } catch (e) {
                return { status: 'error', error: e.message };
            }
        }

        // --- JavaScript ---
        if (node.type === 'js') {
            try {
                const vm = new VM({
                    timeout: 2000,
                    sandbox: { input: params.input || context.inputs }
                });
                // Wrap code
                const code = `
                    (function() {
                        const process = (data) => { ${params.code} };
                        return process(input);
                    })()
                `;
                const res = vm.run(code);
                return { status: 'success', output: res };
            } catch (e) {
                throw e;
            }
        }

        // --- Timer / Wait ---
        if (node.type === 'wait') {
            const ms = (Number(params.seconds) || 1) * 1000;
            await new Promise(r => setTimeout(r, ms));
            return { status: 'success', output: { waited: ms } };
        }

        // --- Default Pass-through ---
        return { status: 'success', output: params };
    }
}

module.exports = { WorkflowEngine };
