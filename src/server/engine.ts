
import axios from 'axios';
import vm from 'vm';
// Fix: Import from ../src/core because server is at root and core is in src/core
import { WorkflowEngine as CoreEngine } from '../core/WorkflowEngine';
import { WorkflowDefinition, NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../core/types';

/**
 * Server-Side Node Runner Implementations
 * Wraps the CoreEngine with Server-specific Context and Node.js native VM.
 */

// --- Logger Utility ---

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
};

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function formatOutput(output: any, maxLength: number = 200): string {
    if (output === undefined || output === null) return 'null';
    const str = typeof output === 'object' ? JSON.stringify(output) : String(output);
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + '...';
    }
    return str;
}

class ServerLogger {
    private workflowName: string;
    private startTime: number;
    private nodeStartTimes: Map<string, number> = new Map();

    constructor(workflowName: string) {
        this.workflowName = workflowName;
        this.startTime = Date.now();
    }

    private getTimestamp(): string {
        return new Date().toISOString().split('T')[1].split('.')[0];
    }

    private getElapsed(): string {
        return formatDuration(Date.now() - this.startTime);
    }

    private prefix(): string {
        return `${LOG_COLORS.gray}[${this.getTimestamp()}]${LOG_COLORS.reset} ${LOG_COLORS.cyan}[${this.workflowName}]${LOG_COLORS.reset}`;
    }

    log(level: LogLevel, message: string, details?: any) {
        const levelColors: Record<LogLevel, string> = {
            debug: LOG_COLORS.gray,
            info: LOG_COLORS.blue,
            warn: LOG_COLORS.yellow,
            error: LOG_COLORS.red,
        };

        const levelStr = `${levelColors[level]}[${level.toUpperCase()}]${LOG_COLORS.reset}`;
        let output = `${this.prefix()} ${levelStr} ${message}`;

        if (details !== undefined) {
            const detailStr = typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details);
            output += `\n${LOG_COLORS.dim}${detailStr}${LOG_COLORS.reset}`;
        }

        console.log(output);
    }

    workflowStart(nodeCount: number, startNodes: string[]) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`${this.prefix()} ${LOG_COLORS.bright}${LOG_COLORS.green}▶ WORKFLOW STARTED${LOG_COLORS.reset}`);
        console.log(`${LOG_COLORS.dim}   Nodes: ${nodeCount} | Start: [${startNodes.join(', ')}]${LOG_COLORS.reset}`);
        console.log(`${'─'.repeat(60)}`);
    }

    workflowEnd(success: boolean, nodeResults: Record<string, any>) {
        const elapsed = this.getElapsed();
        const successCount = Object.values(nodeResults).filter((r: any) => r.status === 'success').length;
        const errorCount = Object.values(nodeResults).filter((r: any) => r.status === 'error').length;
        const skippedCount = Object.values(nodeResults).filter((r: any) => r.status === 'skipped').length;

        console.log(`${'─'.repeat(60)}`);
        const statusIcon = success ? `${LOG_COLORS.green}✓` : `${LOG_COLORS.red}✗`;
        const statusText = success ? 'COMPLETED' : 'FAILED';
        console.log(`${this.prefix()} ${LOG_COLORS.bright}${statusIcon} WORKFLOW ${statusText}${LOG_COLORS.reset}`);
        console.log(`${LOG_COLORS.dim}   Duration: ${elapsed} | Success: ${successCount} | Error: ${errorCount} | Skipped: ${skippedCount}${LOG_COLORS.reset}`);
        console.log(`${'═'.repeat(60)}\n`);
    }

    nodeStart(nodeName: string, nodeType: string, index: number, total: number) {
        this.nodeStartTimes.set(nodeName, Date.now());
        console.log(`${this.prefix()} ${LOG_COLORS.magenta}┌─[${index}/${total}]${LOG_COLORS.reset} ${LOG_COLORS.bright}${nodeName}${LOG_COLORS.reset} ${LOG_COLORS.dim}(${nodeType})${LOG_COLORS.reset}`);
    }

    nodeInput(nodeName: string, params: any) {
        if (params && Object.keys(params).length > 0) {
            console.log(`${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.dim}Input: ${formatOutput(params, 100)}${LOG_COLORS.reset}`);
        }
    }

    nodeLog(nodeName: string, message: string) {
        console.log(`${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.gray}→ ${message}${LOG_COLORS.reset}`);
    }

    nodeEnd(nodeName: string, status: string, output?: any, error?: string) {
        const startTime = this.nodeStartTimes.get(nodeName) || Date.now();
        const duration = formatDuration(Date.now() - startTime);

        let statusIcon: string;
        let statusColor: string;

        switch (status) {
            case 'success':
                statusIcon = '✓';
                statusColor = LOG_COLORS.green;
                break;
            case 'error':
                statusIcon = '✗';
                statusColor = LOG_COLORS.red;
                break;
            case 'skipped':
                statusIcon = '○';
                statusColor = LOG_COLORS.yellow;
                break;
            default:
                statusIcon = '?';
                statusColor = LOG_COLORS.gray;
        }

        if (output !== undefined && status === 'success') {
            console.log(`${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.dim}Output: ${formatOutput(output, 100)}${LOG_COLORS.reset}`);
        }

        if (error) {
            console.log(`${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.red}Error: ${error}${LOG_COLORS.reset}`);
        }

        console.log(`${this.prefix()} ${LOG_COLORS.magenta}└─${LOG_COLORS.reset} ${statusColor}${statusIcon} ${status.toUpperCase()}${LOG_COLORS.reset} ${LOG_COLORS.dim}(${duration})${LOG_COLORS.reset}`);
    }

    connection(from: string, to: string, condition?: string) {
        const condStr = condition ? ` ${LOG_COLORS.dim}when: ${condition}${LOG_COLORS.reset}` : '';
        console.log(`${this.prefix()} ${LOG_COLORS.gray}   ↓ ${from} → ${to}${condStr}${LOG_COLORS.reset}`);
    }
}

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
            console: { log: () => { } },
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
            context.log('⚠ Skipped: No URL provided');
            return { status: 'skipped', output: { error: "No URL provided" }, logs: ["Missing URL"] };
        }

        const method = params.method || 'GET';
        context.log(`→ ${method} ${params.url}`);

        if (params.headers && Object.keys(params.headers).length > 0) {
            context.log(`  Headers: ${Object.keys(params.headers).join(', ')}`);
        }

        if (params.body) {
            const bodyPreview = typeof params.body === 'object'
                ? JSON.stringify(params.body).substring(0, 50)
                : String(params.body).substring(0, 50);
            context.log(`  Body: ${bodyPreview}${bodyPreview.length >= 50 ? '...' : ''}`);
        }

        const startTime = Date.now();

        try {
            const resp = await axios({
                method: method,
                url: params.url,
                headers: params.headers,
                data: params.body,
                validateStatus: () => true,
                timeout: 30000
            });

            const duration = Date.now() - startTime;
            const isError = resp.status >= 400;

            context.log(`← ${resp.status} ${resp.statusText} (${duration}ms)`);

            if (resp.data) {
                const dataPreview = typeof resp.data === 'object'
                    ? JSON.stringify(resp.data).substring(0, 80)
                    : String(resp.data).substring(0, 80);
                context.log(`  Response: ${dataPreview}${dataPreview.length >= 80 ? '...' : ''}`);
            }

            return {
                status: isError ? 'error' : 'success',
                inputs: params,
                output: {
                    status: resp.status,
                    data: resp.data,
                    headers: resp.headers
                },
                logs: [`${method} ${params.url} → ${resp.status} (${duration}ms)`],
                error: isError ? `HTTP Error ${resp.status}: ${resp.statusText}` : undefined
            };
        } catch (e: any) {
            const duration = Date.now() - startTime;
            context.log(`✗ Request failed after ${duration}ms: ${e.message}`);
            return {
                status: 'error',
                error: e.message,
                logs: [`Request failed: ${e.message}`]
            };
        }
    }
}

class ServerJsRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const params = interpolate(node.parameters, context);
        const code = params.code || "";
        const input = params.input || context.inputs;

        // Log code preview
        const codeLines = code.split('\n').filter((l: string) => l.trim());
        context.log(`→ Executing JavaScript (${codeLines.length} lines)`);
        if (codeLines.length > 0 && codeLines.length <= 3) {
            codeLines.forEach((line: string) => context.log(`  | ${line.trim()}`));
        } else if (codeLines.length > 3) {
            context.log(`  | ${codeLines[0].trim()}`);
            context.log(`  | ... (${codeLines.length - 2} more lines)`);
            context.log(`  | ${codeLines[codeLines.length - 1].trim()}`);
        }

        // Log input keys
        if (input && typeof input === 'object') {
            const inputKeys = Object.keys(input);
            if (inputKeys.length > 0) {
                context.log(`  Input vars: ${inputKeys.slice(0, 5).join(', ')}${inputKeys.length > 5 ? '...' : ''}`);
            }
        }

        const startTime = Date.now();
        const logs: string[] = [];

        try {
            // Using Node's native VM module
            const sandbox = {
                input,
                console: {
                    log: (m: any) => {
                        const msg = String(m);
                        logs.push(msg);
                        context.log(`  [console.log] ${msg}`);
                    },
                    error: (m: any) => {
                        const msg = `[Error] ${String(m)}`;
                        logs.push(msg);
                        context.log(`  [console.error] ${String(m)}`);
                    },
                    info: (m: any) => {
                        const msg = `[Info] ${String(m)}`;
                        logs.push(msg);
                        context.log(`  [console.info] ${String(m)}`);
                    },
                    warn: (m: any) => {
                        const msg = `[Warn] ${String(m)}`;
                        logs.push(msg);
                        context.log(`  [console.warn] ${String(m)}`);
                    }
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
            const duration = Date.now() - startTime;

            context.log(`← Completed in ${duration}ms`);

            // Log result preview
            if (result !== undefined) {
                const resultStr = typeof result === 'object'
                    ? JSON.stringify(result).substring(0, 80)
                    : String(result).substring(0, 80);
                context.log(`  Result: ${resultStr}${resultStr.length >= 80 ? '...' : ''}`);
            }

            return {
                status: 'success',
                inputs: params,
                output: result,
                logs: [`Script executed in ${duration}ms`, ...logs]
            };
        } catch (e: any) {
            const duration = Date.now() - startTime;
            context.log(`✗ Runtime error after ${duration}ms: ${e.message}`);

            // Try to extract line number from error
            if (e.stack) {
                const lineMatch = e.stack.match(/<anonymous>:(\d+):(\d+)/);
                if (lineMatch) {
                    context.log(`  at line ${parseInt(lineMatch[1]) - 2}, column ${lineMatch[2]}`);
                }
            }

            return {
                status: 'error',
                error: e.message,
                logs: [`Runtime Error: ${e.message}`, ...logs]
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
            context.log(`⏳ Waiting ${seconds} second${seconds !== 1 ? 's' : ''}...`);
            const startTime = Date.now();
            await new Promise(r => setTimeout(r, seconds * 1000));
            const actualWait = Date.now() - startTime;
            context.log(`✓ Wait completed (actual: ${actualWait}ms)`);
            return {
                status: 'success',
                inputs: params,
                output: { waited: seconds, actualMs: actualWait },
                logs: [`Waited ${seconds}s (${actualWait}ms)`]
            };
        }

        // Handle Timer/Trigger nodes
        if (node.type === 'timer' || node.type === 'manual' || node.type === 'webhook') {
            context.log(`⚡ Trigger activated: ${node.type}`);
            if (params.cron) {
                context.log(`  Cron: ${params.cron}`);
            }
            // IMPORTANT: Merge params into output so they propagate to $P for downstream conditions
            return {
                status: 'success',
                inputs: params,
                output: {
                    ...params,  // Include all trigger parameters in output
                    triggered: true,
                    type: node.type,
                    timestamp: new Date().toISOString()
                },
                logs: [`Trigger: ${node.type}`]
            };
        }

        // Handle Set/Transform nodes
        if (node.type === 'set' || node.type === 'transform') {
            context.log(`→ Setting values`);
            const output = params.values || params.data || params;
            if (typeof output === 'object') {
                Object.keys(output).forEach(key => {
                    const val = output[key];
                    const valStr = typeof val === 'object' ? JSON.stringify(val).substring(0, 50) : String(val).substring(0, 50);
                    context.log(`  ${key}: ${valStr}`);
                });
            }
            return {
                status: 'success',
                inputs: params,
                output: output,
                logs: [`Set ${Object.keys(output).length} value(s)`]
            };
        }

        // Handle Condition/If nodes
        if (node.type === 'if' || node.type === 'condition' || node.type === 'switch') {
            context.log(`🔀 Evaluating condition`);
            if (params.condition) {
                context.log(`  Condition: ${String(params.condition).substring(0, 50)}`);
            }
            return {
                status: 'success',
                inputs: params,
                output: { evaluated: true, ...params },
                logs: [`Condition evaluated`]
            };
        }

        // Handle Loop nodes
        if (node.type === 'loop' || node.type === 'foreach') {
            const items = params.items || params.array || [];
            context.log(`🔄 Loop over ${Array.isArray(items) ? items.length : 0} items`);
            return {
                status: 'success',
                inputs: params,
                output: { items, count: Array.isArray(items) ? items.length : 0 },
                logs: [`Loop: ${Array.isArray(items) ? items.length : 0} items`]
            };
        }

        // General pass-through for other nodes
        context.log(`→ Executing ${node.type} node`);
        if (params && Object.keys(params).length > 0) {
            const paramKeys = Object.keys(params);
            context.log(`  Parameters: ${paramKeys.slice(0, 5).join(', ')}${paramKeys.length > 5 ? '...' : ''}`);
        }

        return {
            status: 'success',
            inputs: params,
            output: { ...params, _nodeType: node.type, _executed: true },
            logs: [`Executed ${node.type}`]
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
    private workflow: WorkflowDefinition;
    private logger: ServerLogger;
    private lastLogCount: number = 0;
    private processedNodes: Set<string> = new Set();
    private nodeIndex: number = 0;

    constructor(workflow: WorkflowDefinition) {
        this.workflow = workflow;
        this.logger = new ServerLogger(workflow.name || 'unnamed');

        this.engine = new CoreEngine(
            workflow,
            {
                // Engine Callbacks
                onUpdate: (state) => {
                    this.handleStateUpdate(state);
                },
                getRunner: (type: string) => this.wrapRunner(getRunner(type)),
                evaluateCondition: (cond, ctx) => {
                    // Logic: Remove outer {{ }} if present, then safeEval
                    const raw = String(cond).trim();
                    const expr = (raw.startsWith('{{') && raw.endsWith('}}'))
                        ? raw.slice(2, -2).trim()
                        : (raw.startsWith('=') ? raw.slice(1).trim() : raw);

                    try {
                        const res = safeEval(expr, ctx);
                        const result = !!res;
                        return result;
                    } catch {
                        return false;
                    }
                }
            }
        );
    }

    /**
     * Wrap runner to add detailed logging
     */
    private wrapRunner(runner: NodeRunner): NodeRunner {
        return {
            run: async (node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> => {
                // Log node start
                if (!this.processedNodes.has(node.name)) {
                    this.nodeIndex++;
                    this.logger.nodeStart(node.name, node.type, this.nodeIndex, this.workflow.nodes.length);
                    this.processedNodes.add(node.name);

                    // Log input parameters
                    if (node.parameters) {
                        const params = interpolate(node.parameters, context);
                        this.logger.nodeInput(node.name, params);
                    }
                }

                // Create wrapped context with enhanced logging
                const wrappedContext: NodeRunnerContext = {
                    ...context,
                    log: (msg: string) => {
                        this.logger.nodeLog(node.name, msg);
                        context.log(msg);
                    }
                };

                // Execute the actual runner
                const result = await runner.run(node, wrappedContext);

                // Log node end
                this.logger.nodeEnd(
                    node.name,
                    result.status || 'success',
                    result.output,
                    result.error
                );

                return result;
            }
        };
    }

    /**
     * Handle state updates from the engine
     */
    private handleStateUpdate(state: any) {
        // Log new messages (from engine internal logs)
        if (state.logs.length > this.lastLogCount) {
            const newLogs = state.logs.slice(this.lastLogCount);
            newLogs.forEach((l: string) => {
                // Filter out redundant logs that we're already handling
                if (!l.includes('Starting execution') && !l.includes('Workflow execution finished')) {
                    this.logger.log('info', l);
                }
            });
            this.lastLogCount = state.logs.length;
        }
    }

    async run() {
        // Log workflow start
        const startNodes = this.workflow.nodes
            .filter(n => ['manual', 'webhook', 'timer'].includes(n.type))
            .map(n => n.name);

        if (startNodes.length === 0 && this.workflow.nodes.length > 0) {
            startNodes.push(this.workflow.nodes[0].name);
        }

        this.logger.workflowStart(this.workflow.nodes.length, startNodes);

        // Execute workflow
        await this.engine.execute('run');

        // Determine success
        const hasErrors = Object.values(this.engine.state.nodeResults)
            .some((r: any) => r.status === 'error');

        // Log workflow end
        this.logger.workflowEnd(!hasErrors, this.engine.state.nodeResults);

        // Return final state
        return {
            results: this.engine.state.nodeResults,
            logs: this.engine.state.logs
        };
    }
}
