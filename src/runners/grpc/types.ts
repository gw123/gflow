/**
 * gRPC Plugin Configuration Types
 * 
 * 定义 gRPC 插件配置文件的类型
 */

import { PluginParameterDefinition } from '../../types';

/**
 * TLS 配置
 */
export interface TlsConfig {
    enabled: boolean;
    cert_path?: string;
    key_path?: string;
    ca_path?: string;
    insecure?: boolean;
}

/**
 * 单个插件配置
 */
export interface GrpcPluginConfig {
    /** 插件显示名称 */
    name: string;

    /** 插件类型标识（用于节点 type） */
    kind: string;

    /** gRPC 服务端点 (host:port) */
    endpoint: string;

    /** 是否启用 */
    enabled: boolean;

    /** 是否启用健康检查 */
    health_check?: boolean;

    /** 插件描述 */
    description?: string;

    /** 插件版本 */
    version?: string;

    /** 插件分类 */
    category?: 'trigger' | 'action' | 'ai' | 'control' | 'system' | 'data' | 'human' | 'plugin';

    /** 图标名称 (Lucide icon name) */
    icon?: string;

    /** 颜色主题 */
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo' | 'cyan' | 'orange' | 'gray';

    /** TLS 配置 */
    tls?: TlsConfig;

    /** 连接超时时间（毫秒） */
    connect_timeout_ms?: number;

    /** 请求超时时间（毫秒） */
    request_timeout_ms?: number;

    /** 重试次数 */
    max_retries?: number;

    /** 凭证类型 */
    credential_type?: string;
}

/**
 * 插件配置文件根结构
 */
export interface GrpcPluginsConfig {
    plugins: GrpcPluginConfig[];
}

/**
 * 从 gRPC 获取的插件元数据
 */
export interface GrpcPluginMetadata {
    name: string;
    displayName: string;
    description: string;
    version: string;
    category: string;
    nodeType: string;
    credentialType?: string;
    inputParameters: PluginParameterDefinition[];
    outputParameters: PluginParameterDefinition[];
    capabilities: {
        supportsStreaming: boolean;
        supportsCancel: boolean;
        supportsRetry: boolean;
        supportsBatch: boolean;
        requiresCredential: boolean;
        maxConcurrent: number;
        defaultTimeoutMs: number;
    };
}

/**
 * 已注册的 gRPC 插件信息
 */
export interface RegisteredGrpcPlugin {
    config: GrpcPluginConfig;
    metadata?: GrpcPluginMetadata;
    status: 'unknown' | 'healthy' | 'unhealthy' | 'connecting';
    lastHealthCheck?: Date;
    error?: string;
}

/**
 * 颜色映射表
 */
export const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    green: { text: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
    red: { text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    yellow: { text: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    pink: { text: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
    cyan: { text: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
    orange: { text: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
    gray: { text: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' },
};
