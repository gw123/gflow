/**
 * Dynamic gRPC Node Runner
 * 
 * 动态 gRPC 节点运行器，用于执行通过 YAML 配置注册的 gRPC 插件
 * 每个插件实例都有独立的 endpoint 配置
 */

import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Value 类型转换工具
 */
function toProtoValue(val: any): any {
    if (val === null || val === undefined) {
        return { null_value: 'NULL_VALUE' };
    }
    if (typeof val === 'string') {
        return { string_value: val };
    }
    if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            return { int_value: String(val) };  // gRPC uses string for int64
        }
        return { double_value: val };
    }
    if (typeof val === 'boolean') {
        return { bool_value: val };
    }
    if (Array.isArray(val)) {
        return {
            list_value: { values: val.map(v => toProtoValue(v)) }
        };
    }
    if (typeof val === 'object') {
        const fields: Record<string, any> = {};
        for (const key in val) {
            fields[key] = toProtoValue(val[key]);
        }
        return {
            map_value: { fields }
        };
    }
    return { string_value: String(val) };
}

/**
 * 将对象转换为 proto map
 */
function mapToProto(obj: any): Record<string, any> {
    const result: Record<string, any> = {};
    if (!obj) return result;
    for (const key in obj) {
        result[key] = toProtoValue(obj[key]);
    }
    return result;
}

/**
 * 从 proto Value 转换为 JS 值
 */
function fromProtoValue(value: any): any {
    if (!value) return null;

    if (value.null_value !== undefined) return null;
    if (value.string_value !== undefined) return value.string_value;
    if (value.int_value !== undefined) return Number(value.int_value);
    if (value.double_value !== undefined) return value.double_value;
    if (value.bool_value !== undefined) return value.bool_value;
    if (value.bytes_value !== undefined) return value.bytes_value;

    if (value.list_value) {
        return (value.list_value.values || []).map(fromProtoValue);
    }

    if (value.map_value) {
        const result: Record<string, any> = {};
        for (const key in value.map_value.fields) {
            result[key] = fromProtoValue(value.map_value.fields[key]);
        }
        return result;
    }

    return null;
}

/**
 * 从 proto map 转换为 JS 对象
 */
function mapFromProto(protoMap: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    if (!protoMap) return result;
    for (const key in protoMap) {
        result[key] = fromProtoValue(protoMap[key]);
    }
    return result;
}

/**
 * 动态 gRPC 节点运行器
 */
export class DynamicGrpcNodeRunner implements NodeRunner {
    private kind: string;
    private endpoint: string;
    private pluginManager: any; // Using any to avoid circular dependency type issues

    // Cache initialization state per execution (or generally per node)
    private initializedSessions = new Set<string>();

    constructor(kind: string, endpoint: string, pluginManager: any) {
        this.kind = kind;
        this.endpoint = endpoint;
        this.pluginManager = pluginManager;
    }

    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const { log } = context;

        // 参数插值
        const params = interpolate(node.parameters, context);

        log(`[gRPC] Executing plugin '${this.kind}' at ${this.endpoint}`);

        try {
            // 获取 gRPC 客户端
            const client = this.pluginManager.getClient(this.kind);
            if (!client) {
                throw new Error(`gRPC client not found for plugin: ${this.kind}. Make sure the plugin is registered.`);
            }

            // Skipped manual health check for efficiency

            // Ensure we have a valid Execution Context ID for this run scope
            // Fallback to timestamp if not provided by context
            const executionId = (context as any).executionId || `exec-${Date.now()}`;
            const traceId = `trace-${Date.now()}`;
            const spanId = `span-${Date.now()}`;

            const requestContext = {
                workflow_id: context.workflow.name,
                execution_id: executionId,
                node_id: node.name,
                trace_id: traceId,
                span_id: spanId,
                retry_count: 0,
                timeout_ms: 30000,
                metadata: {},
            };

            // Initialization Logic with Caching
            // We cache based on 'executionId:nodeName'.
            const initCacheKey = `${executionId}:${node.name}`;

            if (!this.initializedSessions.has(initCacheKey)) {
                await this.init(client, node, context, requestContext, log);
                this.initializedSessions.add(initCacheKey);

                // Prevent unbounded growth of cache 
                if (this.initializedSessions.size > 200) {
                    this.initializedSessions.clear();
                    this.initializedSessions.add(initCacheKey);
                }
            }

            // Execute
            const result = await this.runStream(client, params, context, requestContext, log);

            return {
                status: 'success',
                inputs: params,
                output: result.output,
                logs: context.executionState.nodeResults[node.name]?.logs || [],
            };
        } catch (error: any) {
            log(`[gRPC] Error: ${error.message}`);
            return {
                status: 'error',
                inputs: params,
                error: error.message,
                logs: context.executionState.nodeResults[node.name]?.logs || [],
            };
        }
    }

    /**
     * 健康检查 - Deprecated in run loop for efficiency
     */
    private async healthCheck(client: any, log: (msg: string) => void): Promise<void> {
        return Promise.resolve();
    }

    /**
     * 初始化插件
     */
    private async init(
        client: any,
        node: NodeDefinition,
        context: NodeRunnerContext,
        requestContext: any,
        log: (msg: string) => void
    ): Promise<void> {
        log(`[gRPC] Initializing plugin...`);

        const initRequest = {
            context: requestContext,
            node_config: {
                id: node.name,
                name: node.name,
                kind: this.kind,
                parameters: mapToProto(node.parameters),
                labels: {},
                position: { x: 0, y: 0 },
            },
            workflow_config: {
                id: context.workflow.name,
                name: context.workflow.name,
                version: '1.0.0',
                global_vars: mapToProto(context.global),
                env: {},
            },
            server_endpoint: 'http://localhost:3000',
            credential: node.credentials ? {
                type: node.credentialType || '',
                fields: mapToProto(node.credentials),
                expires_at_ms: 0,
            } : undefined,
        };

        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 10);

            client.Init(initRequest, { deadline }, (error: any, response: any) => {
                if (error) {
                    reject(new Error(`Init failed: ${error.message}`));
                    return;
                }

                if (!response.success) {
                    reject(new Error(`Init failed: ${response.error_message || response.error_code || 'Unknown error'}`));
                    return;
                }

                log(`[gRPC] Plugin initialized`);
                resolve();
            });
        });
    }

    /**
     * 执行插件（流式）
     */
    private async runStream(
        client: any,
        params: Record<string, any>,
        context: NodeRunnerContext,
        requestContext: any,
        log: (msg: string) => void
    ): Promise<{ output: any; branchIndex: number }> {
        const runRequest = {
            context: requestContext,
            parameters: mapToProto(params),
            parent_output: mapToProto(context.inputs),
            global_vars: mapToProto(context.global),
            local_vars: {},
        };

        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 60);

            const stream = client.Run(runRequest, { deadline });

            let output: any = {};
            let branchIndex = 0;
            let hasResult = false;

            stream.on('data', (response: any) => {
                const type = response.type;

                // 处理日志
                if (type === 'RESPONSE_TYPE_LOG' || type === 1) {
                    const payload = response.log;
                    if (payload) {
                        const level = payload.level || 'INFO';
                        log(`[Plugin ${level}] ${payload.message}`);
                    }
                }

                // 处理进度
                if (type === 'RESPONSE_TYPE_PROGRESS' || type === 2) {
                    const payload = response.progress;
                    if (payload) {
                        log(`[Plugin Progress] ${payload.percentage?.toFixed(1) || 0}% - ${payload.message || ''}`);
                    }
                }

                // 处理结果
                if (type === 'RESPONSE_TYPE_RESULT' || type === 3) {
                    const payload = response.result;
                    if (payload) {
                        output = mapFromProto(payload.output);
                        branchIndex = payload.branch_index || 0;
                        hasResult = true;
                        log(`[Plugin] Result received (branch: ${branchIndex})`);
                    }
                }

                // 处理错误
                if (type === 'RESPONSE_TYPE_ERROR' || type === 4) {
                    const payload = response.error;
                    if (payload) {
                        const errorMsg = payload.message || 'Unknown error';
                        log(`[Plugin Error] ${payload.code || 'ERROR'}: ${errorMsg}`);
                        reject(new Error(errorMsg));
                    }
                }
            });

            stream.on('error', (error: any) => {
                log(`[gRPC] Stream error: ${error.message}`);
                reject(error);
            });

            stream.on('end', () => {
                log(`[gRPC] Stream completed`);
                if (!hasResult) {
                    log(`[gRPC] Warning: No result received from plugin`);
                }
                resolve({ output, branchIndex });
            });
        });
    }
}
