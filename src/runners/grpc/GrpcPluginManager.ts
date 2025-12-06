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

            console.log(`[GrpcPluginManager] Plugin registered: ${kind} (status: ${registeredPlugin.status})`);
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
                },
            },
            runner: new DynamicGrpcNodeRunner(config.kind, config.endpoint),
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
        }, 30000);
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
}

// 导出单例
export const GrpcPluginManager = new GrpcPluginManagerClass();
