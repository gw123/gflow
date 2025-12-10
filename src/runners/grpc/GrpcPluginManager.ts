/**
 * gRPC Plugin Manager
 * 
 * 管理 gRPC 插件的注册、健康检查和生命周期
 * 从 YAML 配置文件加载插件并注册到 Registry
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { Registry } from '../../registry';
import { ServerWorkflowEngine } from '../../server/engine';
import { NodePlugin, PluginParameterDefinition } from '../../types';
import {
    GrpcPluginConfig,
    GrpcPluginsConfig,
    RegisteredGrpcPlugin,
    GrpcPluginMetadata,
    COLOR_MAP
} from './types';
import { DynamicGrpcNodeRunner } from './DynamicGrpcNodeRunner';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Proto 文件路径
const PROTO_PATH = path.resolve(__dirname, '../../../proto/node_plugin.proto');

// Proto 加载选项
const PROTO_LOADER_OPTIONS: protoLoader.Options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

/**
 * gRPC 插件管理器（单例）
 */
class GrpcPluginManagerClass {
    private plugins: Map<string, RegisteredGrpcPlugin> = new Map();
    private clients: Map<string, any> = new Map();
    private protoDefinition: any = null;
    private serviceDefinition: any = null;
    private initialized: boolean = false;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private triggerStreams: Map<string, grpc.ClientReadableStream<any>> = new Map();
    private workflowsWatcherStarted: boolean = false;
    // 指数退避重试状态映射
    private triggerRetry: Map<string, { delayMs: number; attempts: number; maxDelayMs: number; initialDelayMs: number; timer?: NodeJS.Timeout }> = new Map();

    /**
     * 规范化端点字符串用于重复注册判断（忽略协议与本地地址差异）
     */
    private normalizeEndpoint(endpoint: string | undefined): string {
        if (!endpoint) return '';
        let ep = endpoint.trim();
        // 去掉可能的协议前缀
        ep = ep.replace(/^grpc:\/\//, '').replace(/^http:\/\//, '').replace(/^https:\/\//, '');
        // 去掉 IPv6 括号
        ep = ep.replace(/^\[/, '').replace(/\]$/, '');
        // 统一本地地址
        ep = ep.replace('localhost', '127.0.0.1').replace('::1', '127.0.0.1');
        // 去掉多余的斜杠
        ep = ep.replace(/\/+$/, '');
        return ep;
    }

    /**
     * 合并插件配置：优先保留已有的非空 consumer_group，filters 进行浅合并
     */
    private mergePluginConfig(existing: GrpcPluginConfig, incoming: GrpcPluginConfig): GrpcPluginConfig {
        const merged: any = { ...existing, ...incoming };
        // consumer_group：优先保留已有的非空值（配置文件 > 自注册），除非现有为空
        const oldGroup = (existing as any)?.consumer_group;
        const newGroup = (incoming as any)?.consumer_group;
        if (oldGroup !== undefined && oldGroup !== null && oldGroup !== '') {
            (merged as any).consumer_group = oldGroup;
        } else {
            (merged as any).consumer_group = newGroup;
        }
        // filters：若新值为空则保留旧值，否则浅合并
        const newFilters = (incoming as any)?.filters;
        const oldFilters = (existing as any)?.filters;
        if (!newFilters || (typeof newFilters === 'object' && Object.keys(newFilters).length === 0)) {
            (merged as any).filters = oldFilters;
        } else {
            (merged as any).filters = { ...(oldFilters || {}), ...newFilters };
        }
        return merged as GrpcPluginConfig;
    }

    /**
     * 初始化管理器
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // 加载 proto 定义
            const packageDefinition = await protoLoader.load(PROTO_PATH, PROTO_LOADER_OPTIONS);
            this.protoDefinition = grpc.loadPackageDefinition(packageDefinition);
            this.serviceDefinition = (this.protoDefinition as any).node_plugin.NodePluginService;

            this.initialized = true;
            console.log('[GrpcPluginManager] Initialized successfully');
        } catch (error) {
            console.error('[GrpcPluginManager] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * 从 YAML 配置文件加载插件
     */
    async loadFromConfig(configPath: string): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = yaml.load(configContent) as GrpcPluginsConfig;

            if (!config || !config.plugins) {
                console.warn('[GrpcPluginManager] No plugins found in config');
                return;
            }

            console.log(`[GrpcPluginManager] Loading ${config.plugins.length} plugins from config...`);

            for (const pluginConfig of config.plugins) {
                if (!pluginConfig.enabled) {
                    console.log(`[GrpcPluginManager] Skipping disabled plugin: ${pluginConfig.kind}`);
                    continue;
                }

                await this.registerPlugin(pluginConfig);
            }

            // 启动健康检查定时器
            this.startHealthCheckTimer();

            // 启动工作流文件变化监听，用于按需启动/停止触发订阅
            this.startWorkflowsWatcher();
        } catch (error) {
            console.error('[GrpcPluginManager] Failed to load config:', error);
            throw error;
        }
    }

    /**
     * 注册单个插件
     */
    async registerPlugin(config: GrpcPluginConfig): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize();
        }

        const { kind, endpoint } = config;

        console.log(`[GrpcPluginManager] Registering plugin: ${kind} at ${endpoint}`);

        try {
            // 若已存在同名且端点一致（规范化后）插件，避免重复注册，合并配置后直接返回
            const existing = this.plugins.get(kind);
            const epExisting = this.normalizeEndpoint(existing?.config?.endpoint);
            const epIncoming = this.normalizeEndpoint(endpoint);
            if (existing && existing.config && epExisting && epExisting === epIncoming) {
                existing.config = this.mergePluginConfig(existing.config, config);
                this.plugins.set(kind, existing);
                console.log(`[GrpcPluginManager] Plugin ${kind} already registered at ${epExisting}; skipping duplicate registration`);
                return true;
            }

            // 创建 gRPC 客户端
            const client = this.createClient(endpoint, config);
            this.clients.set(kind, client);

            // 初始化插件信息
            const registeredPlugin: RegisteredGrpcPlugin = {
                config,
                status: 'connecting',
            };
            this.plugins.set(kind, registeredPlugin);

            // 尝试获取元数据和健康检查
            let metadata: GrpcPluginMetadata | undefined;

            if (config.health_check !== false) {
                try {
                    const isHealthy = await this.checkHealth(kind);
                    registeredPlugin.status = isHealthy ? 'healthy' : 'unhealthy';
                    registeredPlugin.lastHealthCheck = new Date();

                    if (isHealthy) {
                        // 获取插件元数据
                        metadata = await this.fetchMetadata(kind);
                        registeredPlugin.metadata = metadata;
                    }
                } catch (error: any) {
                    console.warn(`[GrpcPluginManager] Health check failed for ${kind}:`, error.message);
                    registeredPlugin.status = 'unhealthy';
                    registeredPlugin.error = error.message;
                }
            } else {
                registeredPlugin.status = 'unknown';
            }

            // 创建 NodePlugin 并注册到 Registry
            const nodePlugin = this.createNodePlugin(config, metadata);
            Registry.register(nodePlugin);

            // 若为触发类插件，订阅触发事件流
            const category = nodePlugin.category;
            if (category === 'trigger') {
                // 仅当存在引用该触发器的工作流时才订阅
                if (this.shouldSubscribeForTrigger(kind)) {
                    // 避免重复启动导致立刻取消与重建
                    if (!this.triggerStreams.has(kind)) {
                        this.startTriggerSubscription(kind).catch(err => {
                            console.warn(`[GrpcPluginManager] Failed to start trigger subscription for ${kind}:`, err?.message || err);
                        });
                    } else {
                        console.log(`[GrpcPluginManager] Trigger subscription already active for ${kind}; skipping`);
                    }
                } else {
                    console.log(`[GrpcPluginManager] Skip trigger subscription for ${kind}: no workflows reference this trigger`);
                }
            }

            console.log(`[GrpcPluginManager] ✅ Successfully registered plugin configuration: ${kind}. Status: ${registeredPlugin.status}`);
            return true;
        } catch (error: any) {
            console.error(`[GrpcPluginManager] Failed to register plugin ${kind}:`, error.message);

            const registeredPlugin: RegisteredGrpcPlugin = {
                config,
                status: 'unhealthy',
                error: error.message,
            };
            this.plugins.set(kind, registeredPlugin);

            return false;
        }
    }

    /**
     * 创建 gRPC 客户端
     */
    private createClient(endpoint: string, config: GrpcPluginConfig): any {
        let credentials: grpc.ChannelCredentials;

        if (config.tls?.enabled) {
            // TLS 连接
            if (config.tls.insecure) {
                credentials = grpc.credentials.createSsl();
            } else {
                const rootCert = config.tls.ca_path ? fs.readFileSync(config.tls.ca_path) : undefined;
                const clientCert = config.tls.cert_path ? fs.readFileSync(config.tls.cert_path) : undefined;
                const clientKey = config.tls.key_path ? fs.readFileSync(config.tls.key_path) : undefined;
                credentials = grpc.credentials.createSsl(rootCert, clientKey, clientCert);
            }
        } else {
            // 不使用 TLS
            credentials = grpc.credentials.createInsecure();
        }

        const options: grpc.ChannelOptions = {
            'grpc.keepalive_time_ms': 10000,
            'grpc.keepalive_timeout_ms': 5000,
        };

        return new this.serviceDefinition(endpoint, credentials, options);
    }

    /**
     * 健康检查
     */
    async checkHealth(kind: string): Promise<boolean> {
        const client = this.clients.get(kind);
        if (!client) {
            throw new Error(`Client not found for plugin: ${kind}`);
        }

        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 5);

            client.HealthCheck({}, { deadline }, (error: any, response: any) => {
                if (error) {
                    reject(error);
                } else {
                    // 兼容两种格式：
                    // 1. 旧格式：response.healthy (boolean)
                    // 2. 新格式：response.status (enum: HEALTH_STATUS_HEALTHY = 1)
                    const isHealthy =
                        response.healthy === true ||
                        response.status === 'HEALTH_STATUS_HEALTHY' ||
                        response.status === 1;
                    resolve(isHealthy);
                }
            });
        });
    }

    /**
     * 获取插件元数据
     */
    async fetchMetadata(kind: string): Promise<GrpcPluginMetadata> {
        const client = this.clients.get(kind);
        if (!client) {
            throw new Error(`Client not found for plugin: ${kind}`);
        }

        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 10);

            client.GetMetadata({}, { deadline }, (error: any, response: any) => {
                if (error) {
                    reject(error);
                    return;
                }

                // 转换为内部格式
                const metadata: GrpcPluginMetadata = {
                    name: response.name || kind,
                    displayName: response.display_name || response.name || kind,
                    description: response.description || '',
                    version: response.version || '1.0.0',
                    category: this.convertCategory(response.category),
                    nodeType: this.convertNodeType(response.node_type),
                    credentialType: response.credential_type,
                    inputParameters: this.convertParameters(response.input_parameters || []),
                    outputParameters: this.convertParameters(response.output_parameters || []),
                    capabilities: {
                        supportsStreaming: response.capabilities?.supports_streaming || false,
                        supportsCancel: response.capabilities?.supports_cancel || false,
                        supportsRetry: response.capabilities?.supports_retry || false,
                        supportsBatch: response.capabilities?.supports_batch || false,
                        requiresCredential: response.capabilities?.requires_credential || false,
                        maxConcurrent: response.capabilities?.max_concurrent || 0,
                        defaultTimeoutMs: response.capabilities?.default_timeout_ms || 30000,
                    },
                };

                resolve(metadata);
            });
        });
    }

    /**
     * 转换分类枚举
     */
    private convertCategory(category: string | number): string {
        const categoryMap: Record<string, string> = {
            'CATEGORY_TRIGGER': 'trigger',
            'CATEGORY_ACTION': 'action',
            'CATEGORY_CONDITION': 'control',
            'CATEGORY_TRANSFORM': 'action',
            'CATEGORY_INTEGRATION': 'action',
            'CATEGORY_UTILITY': 'action',
            'CATEGORY_AI': 'ai',
            'CATEGORY_MEDIA': 'action',
            '1': 'trigger',
            '2': 'action',
            '3': 'control',
            '4': 'action',
            '5': 'action',
            '6': 'action',
            '7': 'ai',
            '8': 'action',
        };
        return categoryMap[String(category)] || 'plugin';
    }

    /**
     * 转换节点类型枚举
     */
    private convertNodeType(nodeType: string | number): string {
        const typeMap: Record<string, string> = {
            'NODE_TYPE_TRIGGER': 'trigger',
            'NODE_TYPE_PROCESSOR': 'processor',
            'NODE_TYPE_BRANCH': 'branch',
            'NODE_TYPE_MERGE': 'merge',
            'NODE_TYPE_SUBFLOW': 'subflow',
            '1': 'trigger',
            '2': 'processor',
            '3': 'branch',
            '4': 'merge',
            '5': 'subflow',
        };
        return typeMap[String(nodeType)] || 'processor';
    }

    /**
     * 转换参数定义
     */
    private convertParameters(params: any[]): PluginParameterDefinition[] {
        const typeMap: Record<string, string> = {
            'PARAM_TYPE_STRING': 'string',
            'PARAM_TYPE_INT': 'int',
            'PARAM_TYPE_FLOAT': 'float',
            'PARAM_TYPE_BOOL': 'bool',
            'PARAM_TYPE_BYTES': 'string',
            'PARAM_TYPE_ARRAY': 'array',
            'PARAM_TYPE_OBJECT': 'object',
            'PARAM_TYPE_ENUM': 'string',
            'PARAM_TYPE_SECRET': 'string',
            'PARAM_TYPE_EXPRESSION': 'string',
            'PARAM_TYPE_CODE': 'string',
            'PARAM_TYPE_JSON': 'object',
            '1': 'string',
            '2': 'int',
            '3': 'float',
            '4': 'bool',
            '5': 'string',
            '6': 'array',
            '7': 'object',
        };

        return params.map((p: any) => ({
            name: p.name,
            type: (typeMap[String(p.type)] || 'string') as any,
            description: p.description,
            required: p.required || false,
            defaultValue: this.convertDefaultValue(p.default_value),
            options: p.options?.map((o: any) => o.value),
        }));
    }

    /**
     * 转换默认值
     */
    private convertDefaultValue(value: any): any {
        if (!value) return undefined;

        if (value.string_value !== undefined) return value.string_value;
        if (value.int_value !== undefined) return Number(value.int_value);
        if (value.double_value !== undefined) return value.double_value;
        if (value.bool_value !== undefined) return value.bool_value;
        if (value.null_value !== undefined) return null;

        return undefined;
    }

    /**
     * 创建 NodePlugin
     */
    private createNodePlugin(config: GrpcPluginConfig, metadata?: GrpcPluginMetadata): NodePlugin {
        const color = config.color || 'green';
        const colorConfig = COLOR_MAP[color] || COLOR_MAP.green;

        // 创建参数定义
        const parameterDefinitions = metadata?.inputParameters || [];

        // 创建默认参数
        const defaultParams: Record<string, any> = {};
        parameterDefinitions.forEach(p => {
            if (p.defaultValue !== undefined) {
                defaultParams[p.name] = p.defaultValue;
            }
        });

        const plugin: NodePlugin = {
            type: config.kind,
            category: config.category || metadata?.category || 'plugin',
            template: {
                name: config.name,
                type: config.kind,
                desc: config.description || metadata?.description,
                parameters: defaultParams,
                parameterDefinitions: parameterDefinitions.length > 0 ? parameterDefinitions : undefined,
                credentialType: config.credential_type || metadata?.credentialType,
                meta: {
                    kind: config.kind,
                    nodeType: metadata?.nodeType || 'processor',
                    credentialType: config.credential_type || metadata?.credentialType,
                    parameters: parameterDefinitions,
                    // 保留分类信息到节点模板，供引擎识别起始节点
                    category: config.category || metadata?.category || 'plugin',
                },
            },
            runner: new DynamicGrpcNodeRunner(config.kind, config.endpoint, this),
            visuals: {
                icon: config.icon || 'Plug',
                color: colorConfig.text,
                bg: colorConfig.bg,
                border: colorConfig.border,
            },
        };

        return plugin;
    }

    /**
     * 启动触发事件订阅（流式）
     */
    private async startTriggerSubscription(kind: string): Promise<void> {
        const client = this.clients.get(kind);
        if (!client) {
            throw new Error(`Client not found for plugin: ${kind}`);
        }

        // 避免重复订阅
        const existing = this.triggerStreams.get(kind);
        if (existing) {
            try { existing.cancel(); } catch {}
            this.triggerStreams.delete(kind);
        }

        const plugin = this.plugins.get(kind);
        const request = {
            consumer_group: (plugin?.config as any)?.consumer_group || '',
            filters: (plugin?.config as any)?.filters || {},
        };

        const call: grpc.ClientReadableStream<any> = client.SubscribeTrigger(request);
        this.triggerStreams.set(kind, call);

        console.log(`[GrpcPluginManager] ▶ Subscribed trigger stream for ${kind}`);

        call.on('data', async (event: any) => {
            try {
                // 收到数据认为连接正常，重置该插件的重试状态
                this.resetTriggerRetry(kind);
                await this.handleTriggerEvent(kind, event);
            } catch (err: any) {
                console.error(`[GrpcPluginManager] Error handling trigger event from ${kind}:`, err?.message || err);
            }
        });

        call.on('error', (err: any) => {
            const msg = err?.message || String(err);
            console.warn(`[GrpcPluginManager] Trigger stream error for ${kind}:`, msg);
            // 指数退避重订阅
            this.scheduleTriggerResubscribe(kind, `error: ${msg}`, true);
        });

        call.on('end', () => {
            console.log(`[GrpcPluginManager] Trigger stream ended for ${kind}`);
            const state = this.getTriggerRetry(kind);
            // 如果刚经历错误并已进入退避周期，避免 end 事件再次调度导致频繁重试
            if (state.attempts > 0) {
                console.log(`[GrpcPluginManager] Skip end resubscribe for ${kind}: backoff in progress (attempts=${state.attempts})`);
                return;
            }
            // 若仍有工作流引用该触发器，则按初始延迟重订阅（不指数增加）
            if (this.shouldSubscribeForTrigger(kind)) {
                this.scheduleTriggerResubscribe(kind, 'end', false);
            } else {
                console.log(`[GrpcPluginManager] Not resubscribing ${kind}: no workflows reference this trigger`);
            }
        });
    }

    /**
     * 触发事件处理：查找匹配工作流并执行
     */
    private async handleTriggerEvent(kind: string, event: any): Promise<void> {
        const payload = this.convertValue(event?.payload);
        const source = event?.source;
        const traceId = event?.trace_id;
        const eventId = event?.event_id;

        const workflows = this.readWorkflows();
        const matched: any[] = [];

        for (const wfRecord of workflows) {
            // 跳过未启用的工作流（支持顶层 enabled 与 content.enabled）
            if (wfRecord && (wfRecord.enabled === false || (wfRecord.content && wfRecord.content.enabled === false))) continue;
            const wf = wfRecord.content;
            if (!wf?.nodes) continue;
            const hasTriggerNode = wf.nodes.some((n: any) => 
                n.type === kind && ((n.meta && n.meta.category === 'trigger') || true)
            );
            if (hasTriggerNode) {
                matched.push(wf);
            }
        }

        if (matched.length === 0) {
            console.log(`[GrpcPluginManager] No workflows matched trigger [${kind}] for source=${source || '-'} event=${eventId || '-'} `);
            return;
        }

        for (const wf of matched) {
            try {
                // 注入触发上下文到全局变量
                wf.global = wf.global || {};
                wf.global.TRIGGER = {
                    kind,
                    source,
                    trace_id: traceId,
                    event_id: eventId,
                    payload,
                };

                const engine = new ServerWorkflowEngine(wf);
                await engine.run();
            } catch (err: any) {
                console.error(`[GrpcPluginManager] Failed to execute workflow ${wf?.name} for trigger ${kind}:`, err?.message || err);
            }
        }
    }

    /**
     * 读取工作流数据文件
     */
    private readWorkflows(): any[] {
        try {
            const flowsDir = path.resolve(__dirname, '../../server/data/flows');
            if (!fs.existsSync(flowsDir)) return [];
            
            const workflows: any[] = [];
            const files = fs.readdirSync(flowsDir);
            
            for (const file of files) {
                if (path.extname(file) !== '.yaml' && path.extname(file) !== '.yml') {
                    continue;
                }
                
                const filePath = path.join(flowsDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const workflow = yaml.load(content);
                    if (workflow) {
                        workflows.push(workflow);
                    }
                } catch (e) {
                    console.warn(`[GrpcPluginManager] Failed to read workflow file ${file}:`, (e as any)?.message || e);
                }
            }
            
            return workflows;
        } catch (e) {
            console.warn('[GrpcPluginManager] Failed to read workflows directory:', (e as any)?.message || e);
            return [];
        }
    }

    /**
     * 将 proto Value 转为 JS 值
     */
    private convertValue(value: any): any {
        if (!value || typeof value !== 'object') return value;
        if (value.string_value !== undefined) return value.string_value;
        if (value.int_value !== undefined) return Number(value.int_value);
        if (value.double_value !== undefined) return value.double_value;
        if (value.bool_value !== undefined) return value.bool_value;
        if (value.null_value !== undefined) return null;
        if (value.bytes_value !== undefined) {
            // 处理 bytes_value，转换为字符串
            if (Array.isArray(value.bytes_value)) {
                return Buffer.from(value.bytes_value).toString();
            } else if (typeof value.bytes_value === 'string') {
                return value.bytes_value;
            }
            return String(value.bytes_value);
        }
        if (value.list_value) {
            return (value.list_value.values || []).map((v: any) => this.convertValue(v));
        }
        if (value.map_value) {
            const out: any = {};
            for (const k of Object.keys(value.map_value.fields || {})) {
                out[k] = this.convertValue(value.map_value.fields[k]);
            }
            return out;
        }
        return value;
    }

    /**
     * 启动健康检查定时器
     */
    private startHealthCheckTimer(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // 每 30 秒检查一次健康状态
        this.healthCheckInterval = setInterval(async () => {
            for (const [kind, plugin] of this.plugins.entries()) {
                if (plugin.config.health_check !== false) {
                    try {
                        const isHealthy = await this.checkHealth(kind);
                        plugin.status = isHealthy ? 'healthy' : 'unhealthy';
                        plugin.lastHealthCheck = new Date();
                        plugin.error = undefined;
                    } catch (error: any) {
                        plugin.status = 'unhealthy';
                        plugin.error = error.message;
                    }
                }
            }
        }, 60000);
    }

    /**
     * 获取客户端
     */
    getClient(kind: string): any {
        return this.clients.get(kind);
    }

    /**
     * 获取所有已注册的插件
     */
    getPlugins(): RegisteredGrpcPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * 获取插件状态
     */
    getPluginStatus(kind: string): RegisteredGrpcPlugin | undefined {
        return this.plugins.get(kind);
    }

    /**
     * 卸载插件
     */
    unregisterPlugin(kind: string): boolean {
        const client = this.clients.get(kind);
        if (client) {
            client.close();
            this.clients.delete(kind);
        }
        const stream = this.triggerStreams.get(kind);
        try { stream?.cancel(); } catch {}
        this.triggerStreams.delete(kind);
        this.clearTriggerRetry(kind);
        return this.plugins.delete(kind);
    }

    /**
     * 重新加载所有插件
     */
    async reloadPlugins(configPath: string): Promise<void> {
        // 卸载所有现有插件
        for (const kind of this.plugins.keys()) {
            this.unregisterPlugin(kind);
        }

        // 重新加载
        await this.loadFromConfig(configPath);
    }

    /**
     * 关闭管理器
     */
    shutdown(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        for (const [kind, client] of this.clients.entries()) {
            try {
                client.close();
            } catch (e) {
                console.warn(`[GrpcPluginManager] Error closing client ${kind}:`, e);
            }
        }

        this.clients.clear();
        this.plugins.clear();
        this.initialized = false;
    }

    /**
     * 判断是否需要为指定触发插件启动订阅（至少有一个工作流引用该触发器）
     */
    private shouldSubscribeForTrigger(kind: string): boolean {
        const workflows = this.readWorkflows();
        for (const wfRecord of workflows) {
            // 跳过未启用的工作流（支持顶层 enabled 与 content.enabled）
            if (wfRecord && (wfRecord.enabled === false || (wfRecord.content && wfRecord.content.enabled === false))) continue;
            const wf = wfRecord.content;
            if (!wf?.nodes) continue;
            const hasTriggerNode = wf.nodes.some((n: any) => {
                const typeMatched = n.type === kind;
                const isTriggerMeta = (n.meta && n.meta.category === 'trigger') || true;
                return typeMatched && isTriggerMeta;
            });
            if (hasTriggerNode) return true;
        }
        return false;
    }

    /**
     * 监听工作流文件变更，根据需要启动/停止各触发插件的订阅
     */
    private startWorkflowsWatcher(): void {
        if (this.workflowsWatcherStarted) return;
        try {
            const flowsDir = path.resolve(__dirname, '../../server/data/flows');
            if (!fs.existsSync(flowsDir)) {
                console.warn('[GrpcPluginManager] Flows directory not found, creating it...');
                fs.mkdirSync(flowsDir, { recursive: true });
            }
            
            // 监听目录变化
            fs.watch(flowsDir, { recursive: true }, (event, filename) => {
                if (filename && (path.extname(filename) === '.yaml' || path.extname(filename) === '.yml')) {
                    try {
                        this.restartAllTriggerSubscriptions();
                    } catch (e) {
                        console.warn('[GrpcPluginManager] Failed to restart trigger subscriptions on workflows change:', (e as any)?.message || e);
                    }
                }
            });
            
            this.workflowsWatcherStarted = true;
            console.log('[GrpcPluginManager] Workflows watcher started for YAML directory');
        } catch (e) {
            console.warn('[GrpcPluginManager] Failed to start workflows watcher:', (e as any)?.message || e);
        }
    }

    /**
     * 根据当前工作流引用情况，按需启动或停止所有触发插件的订阅
     */
    private restartAllTriggerSubscriptions(): void {
        for (const [kind, plugin] of this.plugins.entries()) {
            const nodePlugin = Registry.get(plugin.config.kind);
            const category = nodePlugin?.category || plugin.config.category;
            if (category !== 'trigger') continue;

            const should = this.shouldSubscribeForTrigger(kind);
            const hasStream = this.triggerStreams.has(kind);
            if (should && !hasStream) {
                console.log(`[GrpcPluginManager] ▶ Starting trigger subscription for ${kind} due to workflows change`);
                this.startTriggerSubscription(kind).catch(() => {});
            } else if (!should && hasStream) {
                console.log(`[GrpcPluginManager] ✋ Stopping trigger subscription for ${kind} (no workflows reference)`);
                const existing = this.triggerStreams.get(kind);
                try { existing?.cancel(); } catch {}
                this.triggerStreams.delete(kind);
                // 停止订阅时清理重试状态
                this.clearTriggerRetry(kind);
            }
        }
    }

    /**
     * 获取/初始化触发重试状态
     */
    private getTriggerRetry(kind: string): { delayMs: number; attempts: number; maxDelayMs: number; initialDelayMs: number; timer?: NodeJS.Timeout } {
        let state = this.triggerRetry.get(kind);
        if (!state) {
            state = { delayMs: 1000, attempts: 0, maxDelayMs: 60000, initialDelayMs: 1000 };
            this.triggerRetry.set(kind, state);
        }
        return state;
    }

    /**
     * 重置触发重试状态
     */
    private resetTriggerRetry(kind: string): void {
        const state = this.getTriggerRetry(kind);
        state.attempts = 0;
        state.delayMs = state.initialDelayMs;
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = undefined;
        }
    }

    /**
     * 清理触发重试状态
     */
    private clearTriggerRetry(kind: string): void {
        const state = this.triggerRetry.get(kind);
        if (state?.timer) {
            clearTimeout(state.timer);
        }
        this.triggerRetry.delete(kind);
    }

    /**
     * 调度触发重订阅（带指数退避与抖动）
     * useExponential = true：指数退避；false：使用初始延迟
     */
    private scheduleTriggerResubscribe(kind: string, reason: string, useExponential: boolean = true): void {
        if (!this.shouldSubscribeForTrigger(kind)) {
            console.log(`[GrpcPluginManager] Not resubscribing ${kind}: no workflows reference this trigger`);
            return;
        }

        const state = this.getTriggerRetry(kind);
        let delay = useExponential ? state.delayMs : state.initialDelayMs;
        // 抖动：0.5x ~ 1.0x，避免群体同步重试
        const jitter = 0.5 + Math.random() * 0.5;
        delay = Math.floor(delay * jitter);

        // 取消已存在定时器，避免重复调度
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = undefined;
        }

        console.log(`[GrpcPluginManager] ⏳ Resubscribing ${kind} in ${delay}ms (${reason}, attempt ${state.attempts + 1})`);
        state.timer = setTimeout(() => {
            this.startTriggerSubscription(kind).catch(err => {
                console.warn(`[GrpcPluginManager] Failed to resubscribe ${kind}:`, err?.message || err);
            });
        }, delay);

        // 更新退避参数
        if (useExponential) {
            state.attempts += 1;
            state.delayMs = Math.min(state.delayMs * 2, state.maxDelayMs);
        } else {
            // 正常结束场景保持初始延迟
            state.attempts = 0;
            state.delayMs = state.initialDelayMs;
        }
    }
}

// 导出单例
export const GrpcPluginManager = new GrpcPluginManagerClass();
