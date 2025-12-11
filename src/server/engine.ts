
import axios from 'axios';
import vm from 'vm';
import path from 'path';
// Fix: Import from ../src/core because server is at root and core is in src/core
import { WorkflowEngine as CoreEngine } from '../core/WorkflowEngine';
import { WorkflowDefinition, NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../core/types';
import { HttpNodeRunnerProxy } from '../runners/http';
import { JsNodeRunnerProxy } from '../runners/js';
import { TimeNodeRunnerProxy } from '../runners/time';
import { ControlNodeRunnerProxy } from '../runners/control';
import { DefaultRunnerProxy } from '../runners/default';
import { MediaNodeRunnerProxy } from '../runners/media';
import { PlayMediaNodeRunnerProxy } from '../runners/play-media';
import { AiImageNodeRunnerProxy } from '../runners/ai-image';
import { GrpcNodeRunnerProxy } from '../runners/grpc';
import { InteractionNodeRunnerProxy } from '../runners/interaction';
import { LlmNodeRunnerProxy } from '../runners/llm';
import { Logger, glog } from '../core/Logger';

import { ManualNodeRunnerProxy } from '../runners/manual';
import { SystemNodeRunnerProxy } from '../runners/system';
import { TtsNodeRunnerProxy } from '../runners/tts';
import { interpolate as sharedInterpolate } from '../runners/utils';

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
    private logger: Logger;
    private baseLogger: Logger;

    constructor(workflowName: string) {
        this.workflowName = workflowName;
        this.startTime = Date.now();
        
        // 创建日志实例，只写文件不输出控制台（控制台由 glog 负责）
        this.logger = new Logger({
            logFile: path.join(process.cwd(), 'logs', `${workflowName.toLowerCase().replace(/\s+/g, '-')}.log`),
            level: 'info',
            consoleOutput: false,
            fileOutput: true
        });
        
        // 基础日志实例（用于系统级日志），只写文件不输出控制台
        this.baseLogger = new Logger({
            logFile: path.join(process.cwd(), 'logs', 'gflow.log'),
            level: 'info',
            consoleOutput: false,
            fileOutput: true
        });
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
    
    // 原始控制台输出，用于保持原有格式
    private consoleLog(message: string) {
        glog.info(message);
        // 同时写入到日志文件（无颜色）
        const plainMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
        this.logger.info(plainMessage);
        this.baseLogger.info(plainMessage);
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

        this.consoleLog(output);
    }

    workflowStart(nodeCount: number, startNodes: string[]) {
        const output = `\n${'═'.repeat(60)}\n${this.prefix()} ${LOG_COLORS.bright}${LOG_COLORS.green}▶ WORKFLOW STARTED${LOG_COLORS.reset}\n${LOG_COLORS.dim}   Nodes: ${nodeCount} | Start: [${startNodes.join(', ')}]${LOG_COLORS.reset}\n${'─'.repeat(60)}`;
        this.consoleLog(output);
    }

    workflowEnd(success: boolean, nodeResults: Record<string, any>) {
        const elapsed = this.getElapsed();
        const successCount = Object.values(nodeResults).filter((r: any) => r.status === 'success').length;
        const errorCount = Object.values(nodeResults).filter((r: any) => r.status === 'error').length;
        const skippedCount = Object.values(nodeResults).filter((r: any) => r.status === 'skipped').length;

        const statusIcon = success ? `${LOG_COLORS.green}✓` : `${LOG_COLORS.red}✗`;
        const statusText = success ? 'COMPLETED' : 'FAILED';
        
        const output = `${'─'.repeat(60)}\n${this.prefix()} ${LOG_COLORS.bright}${statusIcon} WORKFLOW ${statusText}${LOG_COLORS.reset}\n${LOG_COLORS.dim}   Duration: ${elapsed} | Success: ${successCount} | Error: ${errorCount} | Skipped: ${skippedCount}${LOG_COLORS.reset}\n${'═'.repeat(60)}\n`;
        this.consoleLog(output);
    }

    nodeStart(nodeName: string, nodeType: string, index: number, total: number) {
        this.nodeStartTimes.set(nodeName, Date.now());
        const output = `${this.prefix()} ${LOG_COLORS.magenta}┌─[${index}/${total}]${LOG_COLORS.reset} ${LOG_COLORS.bright}${nodeName}${LOG_COLORS.reset} ${LOG_COLORS.dim}(${nodeType})${LOG_COLORS.reset}`;
        this.consoleLog(output);
    }

    nodeInput(nodeName: string, params: any) {
        if (params && Object.keys(params).length > 0) {
            const output = `${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.dim}Input: ${formatOutput(params, 100)}${LOG_COLORS.reset}`;
            this.consoleLog(output);
        }
    }

    nodeLog(nodeName: string, message: string) {
        const output = `${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.gray}→ ${message}${LOG_COLORS.reset}`;
        this.consoleLog(output);
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

        let outputStr = '';
        
        if (output !== undefined && status === 'success') {
            outputStr += `${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.dim}Output: ${formatOutput(output, 100)}${LOG_COLORS.reset}\n`;
        }

        if (error) {
            outputStr += `${this.prefix()} ${LOG_COLORS.magenta}│${LOG_COLORS.reset}  ${LOG_COLORS.red}Error: ${error}${LOG_COLORS.reset}\n`;
        }
        
        outputStr += `${this.prefix()} ${LOG_COLORS.magenta}└─${LOG_COLORS.reset} ${statusColor}${statusIcon} ${status.toUpperCase()}${LOG_COLORS.reset} ${LOG_COLORS.dim}(${duration})${LOG_COLORS.reset}`;
        
        this.consoleLog(outputStr);
    }

    connection(from: string, to: string, condition?: string) {
        const condStr = condition ? ` ${LOG_COLORS.dim}when: ${condition}${LOG_COLORS.reset}` : '';
        const output = `${this.prefix()} ${LOG_COLORS.gray}   ↓ ${from} → ${to}${condStr}${LOG_COLORS.reset}`;
        this.consoleLog(output);
    }
}

// --- Utils Adapter ---

const safeEval = (code: any, context: any) => {
    try {
        // 如果不是字符串，直接返回值
        if (typeof code !== 'string') {
            return code;
        }
        
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
        glog.error(`[Server Interpolation Error] Failed to evaluate: "${code}"`, e.message);
        return undefined;
    }
};

// Use shared interpolate from runners/utils
const interpolate = sharedInterpolate;

// --- Runner Factory ---

import { Registry } from '../registry';

/**
 * Get the appropriate runner for a node type.
 * First checks Registry for dynamically registered plugins,
 * then falls back to built-in runners.
 */
const getRunner = (type: string): NodeRunner => {
    // First, check if there's a registered runner in the Registry
    // This allows dynamically registered gRPC plugins to work
    const registeredPlugin = Registry.get(type);
    if (registeredPlugin && registeredPlugin.runner) {
        return registeredPlugin.runner;
    }

    switch (type) {
        // HTTP & Webhook
        case 'http':
        case 'webhook':
            return new HttpNodeRunnerProxy();

        // JavaScript
        case 'js':
        case 'javascript':
        case 'code':
            return new JsNodeRunnerProxy();

        // Time & Wait
        case 'wait':
        case 'timer':
        case 'delay':
            return new TimeNodeRunnerProxy();

        // Control Flow
        case 'if':
        case 'condition':
        case 'switch':
        case 'loop':
        case 'foreach':
            return new ControlNodeRunnerProxy();

        // Media Capture & Playback
        case 'media_capture':
        case 'media':
        case 'capture':
            return new MediaNodeRunnerProxy();
        case 'play_media':
        case 'play':
        case 'playback':
            return new PlayMediaNodeRunnerProxy();

        // AI Image Generation
        case 'ai_image':
        case 'image_gen':
        case 'dalle':
        case 'imagen':
            return new AiImageNodeRunnerProxy();

        // gRPC
        case 'grpc':
            return new GrpcNodeRunnerProxy();

        // User Interaction
        case 'interaction':
        case 'input':
        case 'prompt':
        case 'confirm':
            return new InteractionNodeRunnerProxy();

        // LangChain
        case 'langchain':
        case 'chain':
            return new LlmNodeRunnerProxy();

        // LLM (Large Language Model)
        case 'llm':
        case 'chat':
        case 'gpt':
        case 'gemini':
        case 'claude':
            return new LlmNodeRunnerProxy();

        // Manual Trigger
        case 'manual':
        case 'trigger':
        case 'start':
            return new ManualNodeRunnerProxy();

        // System Commands
        case 'system':
        case 'shell':
        case 'exec':
        case 'command':
            return new SystemNodeRunnerProxy();

        // Text-to-Speech
        case 'tts':
        case 'speech':
        case 'speak':
            return new TtsNodeRunnerProxy();

        // Default fallback
        default:
            return new DefaultRunnerProxy();
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
                    // 如果条件不是字符串，直接返回布尔值
                    if (typeof cond !== 'string') {
                        return !!cond;
                    }
                    
                    // Logic: Remove outer {{ }} if present, then safeEval
                    const raw = cond.trim();
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
                        // Only log through ServerLogger, avoid duplicate context.log calls
                        this.logger.nodeLog(node.name, msg);
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
            .filter(n => (n as any).meta?.category === 'trigger' || ['manual', 'webhook', 'timer'].includes(n.type))
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
