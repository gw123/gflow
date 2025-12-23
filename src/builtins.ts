
import { Registry } from './registry';
import { NodePlugin, NodeVisuals, NodeRunner } from './types';

// Import new proxy runners
import { HttpNodeRunnerProxy } from './runners/http';
import { JsNodeRunnerProxy } from './runners/js';
import { TimeNodeRunnerProxy } from './runners/time';
import { ControlNodeRunnerProxy } from './runners/control';

import { MysqlNodeRunnerProxy } from './runners/mysql';

// Import runners that haven't been refactored yet
import {
    ManualNodeRunner,
    SystemNodeRunner,
    GrpcNodeRunner,
    InteractionNodeRunner,
    MediaNodeRunner,
    PlayMediaNodeRunner,
    AiImageNodeRunner,
    LlmNodeRunner,
    TtsNodeRunner
} from './runners';

const plugins: NodePlugin[] = []

// Register all built-in plugins
plugins.forEach(p => Registry.register(p));

// --- Dynamic Plugin Loading from Server ---

/**
 * Load node templates from server and register them dynamically
 * @param headers - Authentication headers for API requests
 * @returns Promise that resolves when all templates are loaded and registered
 */
export async function loadServerNodeTemplates(headers: Record<string, string>): Promise<void> {
    console.log('[Template Loader] Starting to load node templates...');
    console.log('[Template Loader] Headers:', Object.keys(headers));
    
    try {
        // Import the workflows API module
        const { getNodeTemplates } = await import('./api/modules/workflows');
        
        console.log('[Template Loader] Fetching from API...');
        
        // Fetch node templates from server
        const response = await getNodeTemplates(headers);
        
        console.log('[Template Loader] API Response:', {
            code: response.code,
            message: response.message,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        if (!response.data) {
            console.warn('[Template Loader] No template data received from server');
            return;
        }
        
        let totalLoaded = 0;
        
        // Process each category
        for (const [categoryKey, categoryData] of Object.entries(response.data)) {
            const category = mapServerCategoryToLocal(categoryKey);
            
            console.log(`[Template Loader] Processing category: ${categoryKey} (${categoryData.templates?.length || 0} templates)`);
            
            // Register each template in the category
            for (const template of categoryData.templates || []) {
                try {
                    // Get existing runner for this type, or use default
                    const existingPlugin = Registry.get(template.type);
                    const runner = existingPlugin?.runner || getRunnerForType(template.type);
                    
                    // Generate parameter definitions from parameters
                    const parameterDefinitions = generateParameterDefinitions(template.parameters || {});
                    
                    // Use template description if available, otherwise use category description
                    const description = (template as any).description || (template as any).desc || categoryData.description || `${template.name} node`;
                    
                    // Create NodePlugin from server template
                    const nodePlugin: NodePlugin = {
                        type: template.type,
                        category: category,
                        template: {
                            name: template.name,
                            type: template.type,
                            desc: description,
                            parameters: template.parameters || {},
                            parameterDefinitions: parameterDefinitions,
                            credentials: template.credentials || {},
                            credentialType: template.credentialType
                        },
                        runner: runner,
                        visuals: existingPlugin?.visuals || getVisualsForCategory(category)
                    };
                    
                    Registry.register(nodePlugin);
                    totalLoaded++;
                    console.log(`[Template Loader] ✓ Registered: ${template.name} (${template.type})`);
                } catch (error) {
                    console.error(`[Template Loader] ✗ Failed to register template ${template.name}:`, error);
                }
            }
        }
        
        console.log(`[Template Loader] ✓ Successfully loaded ${totalLoaded} node templates from server`);
        
        // Trigger UI refresh
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNodeLibrary'));
        }
    } catch (error: any) {
        console.error('[Template Loader] ✗ Failed to load node templates from server:', error);
        console.error('[Template Loader] Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Load gRPC plugins from server and register them dynamically
 * @param headers - Authentication headers for API requests
 * @returns Promise that resolves when all plugins are loaded and registered
 */
export async function loadServerPlugins(headers: Record<string, string>): Promise<void> {
    try {
        // Import the plugins API module
        const { getPlugins } = await import('./api/modules/plugins');
        
        // Fetch all plugins from server (paginated)
        const result = await getPlugins(headers, { page_size: 100 });
        
        // Filter only enabled plugins
        const enabledPlugins = result.data.filter(plugin => plugin.enabled);
        
        console.log(`[Plugin Loader] Found ${enabledPlugins.length} enabled gRPC plugins from server`);
        
        // Register each plugin
        for (const serverPlugin of enabledPlugins) {
            try {
                // Determine category based on plugin kind
                const category = getCategoryFromKind(serverPlugin.kind);
                
                // Create NodePlugin from server Plugin
                const nodePlugin: NodePlugin = {
                    type: `grpc_plugin_${serverPlugin.id}`, // Unique type identifier
                    category: category,
                    template: {
                        name: serverPlugin.name,
                        type: `grpc_plugin_${serverPlugin.id}`,
                        desc: serverPlugin.description,
                        parameters: {
                            endpoint: serverPlugin.endpoint,
                            plugin_id: serverPlugin.id,
                            plugin_kind: serverPlugin.kind
                        },
                        meta: {
                            kind: serverPlugin.kind,
                            nodeType: `grpc_plugin_${serverPlugin.id}`,
                            category: category
                        }
                    },
                    runner: new GrpcNodeRunner(), // Use gRPC runner for server plugins
                    visuals: getVisualsForKind(serverPlugin.kind)
                };
                
                Registry.register(nodePlugin);
                console.log(`[Plugin Loader] Registered gRPC plugin: ${serverPlugin.name} (${serverPlugin.kind})`);
            } catch (error) {
                console.error(`[Plugin Loader] Failed to register plugin ${serverPlugin.name}:`, error);
            }
        }
        
        console.log(`[Plugin Loader] Successfully loaded ${enabledPlugins.length} gRPC plugins`);
        
        // Trigger UI refresh
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNodeLibrary'));
        }
    } catch (error) {
        console.error('[Plugin Loader] Failed to load gRPC plugins from server:', error);
        throw error;
    }
}

/**
 * Load all server resources (node templates + gRPC plugins)
 * @param headers - Authentication headers for API requests
 */
export async function loadAllServerResources(headers: Record<string, string>): Promise<void> {
    console.log('[Server Loader] Loading all server resources...');
    
    const results = await Promise.allSettled([
        loadServerNodeTemplates(headers),
        loadServerPlugins(headers)
    ]);
    
    // Log results
    if (results[0].status === 'fulfilled') {
        console.log('[Server Loader] ✓ Node templates loaded');
    } else {
        console.error('[Server Loader] ✗ Node templates failed:', results[0].reason);
    }
    
    if (results[1].status === 'fulfilled') {
        console.log('[Server Loader] ✓ gRPC plugins loaded');
    } else {
        console.error('[Server Loader] ✗ gRPC plugins failed:', results[1].reason);
    }
    
    console.log('[Server Loader] Server resource loading complete');
    
    // Trigger UI refresh
    console.log('[Server Loader] Triggering UI refresh...');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNodeLibrary'));
    }
}

/**
 * Map server category key to local category
 */
function mapServerCategoryToLocal(serverCategory: string): string {
    const categoryMap: Record<string, string> = {
        'cache': 'data',
        'code': 'action',
        'control': 'control',
        'database': 'data',
        'trigger': 'trigger',
        'ai': 'ai',
        'system': 'system',
        'human': 'human',
        'plugin': 'plugin'
    };
    
    return categoryMap[serverCategory.toLowerCase()] || 'action';
}

/**
 * Generate parameter definitions from parameter values
 * This creates the schema needed for the UI to render parameter forms
 */
function generateParameterDefinitions(parameters: Record<string, any>): any[] {
    const definitions: any[] = [];
    
    for (const [key, value] of Object.entries(parameters)) {
        let type: string;
        let defaultValue = value;
        
        // Determine type from value
        if (typeof value === 'string') {
            type = 'string';
        } else if (typeof value === 'number') {
            type = 'number';
        } else if (typeof value === 'boolean') {
            type = 'boolean';
        } else if (Array.isArray(value)) {
            type = 'array';
        } else if (typeof value === 'object' && value !== null) {
            type = 'object';
        } else {
            type = 'string';
            defaultValue = String(value);
        }
        
        // Generate friendly description from key name
        const friendlyName = key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        definitions.push({
            name: key,
            type: type,
            defaultValue: defaultValue,
            description: friendlyName,
            required: false
        });
    }
    
    return definitions;
}

/**
 * Get appropriate runner for node type
 */
function getRunnerForType(type: string): NodeRunner {
    // Map node types to their runners
    const typeRunnerMap: Record<string, NodeRunner> = {
        // HTTP
        'http': new HttpNodeRunnerProxy(),
        'webhook': new HttpNodeRunnerProxy(),
        
        // JavaScript
        'js': new JsNodeRunnerProxy(),
        'code_search': new JsNodeRunnerProxy(),
        'code_project': new JsNodeRunnerProxy(),
        
        // Time
        'wait': new TimeNodeRunnerProxy(),
        'timer': new TimeNodeRunnerProxy(),
        
        // Control
        'if': new ControlNodeRunnerProxy(),
        'switch': new ControlNodeRunnerProxy(),
        'loop': new ControlNodeRunnerProxy(),
        
        // Database
        'mysql': new MysqlNodeRunnerProxy(),
        'pg': new SystemNodeRunner(),
        'redis': new SystemNodeRunner(),
        'redis_list': new SystemNodeRunner(),
        
        // System
        'execute_command': new SystemNodeRunner(),
        'docker': new SystemNodeRunner(),
        'git': new SystemNodeRunner(),
        
        // AI
        'chatgpt': new LlmNodeRunner(),
        'agent': new LlmNodeRunner(),
        'langchain_agent': new LlmNodeRunner(),
        'ai_image_gen': new AiImageNodeRunner(),
        'tts': new TtsNodeRunner(),
        
        // Human
        'user_interaction': new InteractionNodeRunner(),
        
        // Media
        'media_capture': new MediaNodeRunner(),
        'play_media': new PlayMediaNodeRunner(),
        
        // Plugin
        'grpc_plugin': new GrpcNodeRunner()
    };
    
    return typeRunnerMap[type] || new SystemNodeRunner();
}

/**
 * Get visual styling for category
 */
function getVisualsForCategory(category: string): NodeVisuals {
    const categoryVisuals: Record<string, NodeVisuals> = {
        'trigger': {
            icon: 'Play',
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800'
        },
        'action': {
            icon: 'Zap',
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800'
        },
        'ai': {
            icon: 'Brain',
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-purple-200 dark:border-purple-800'
        },
        'control': {
            icon: 'GitBranch',
            color: 'text-slate-600',
            bg: 'bg-slate-50 dark:bg-slate-900/20',
            border: 'border-slate-200 dark:border-slate-800'
        },
        'system': {
            icon: 'Terminal',
            color: 'text-gray-600',
            bg: 'bg-gray-50 dark:bg-gray-900/20',
            border: 'border-gray-200 dark:border-gray-800'
        },
        'data': {
            icon: 'Database',
            color: 'text-cyan-600',
            bg: 'bg-cyan-50 dark:bg-cyan-900/20',
            border: 'border-cyan-200 dark:border-cyan-800'
        },
        'human': {
            icon: 'User',
            color: 'text-pink-600',
            bg: 'bg-pink-50 dark:bg-pink-900/20',
            border: 'border-pink-200 dark:border-pink-800'
        },
        'plugin': {
            icon: 'Plug',
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800'
        }
    };
    
    return categoryVisuals[category] || categoryVisuals['action'];
}

/**
 * Determine category based on plugin kind
 */
function getCategoryFromKind(kind: string): string {
    const kindLower = kind.toLowerCase();
    
    // Map common plugin kinds to categories
    if (kindLower.includes('trigger') || kindLower.includes('webhook') || kindLower.includes('timer')) {
        return 'trigger';
    }
    if (kindLower.includes('ai') || kindLower.includes('llm') || kindLower.includes('ml')) {
        return 'ai';
    }
    if (kindLower.includes('db') || kindLower.includes('database') || kindLower.includes('sql')) {
        return 'data';
    }
    if (kindLower.includes('control') || kindLower.includes('flow') || kindLower.includes('condition')) {
        return 'control';
    }
    if (kindLower.includes('system') || kindLower.includes('command') || kindLower.includes('shell')) {
        return 'system';
    }
    if (kindLower.includes('human') || kindLower.includes('interaction') || kindLower.includes('form')) {
        return 'human';
    }
    
    // Default to plugin category
    return 'plugin';
}

/**
 * Get visual styling based on plugin kind
 */
function getVisualsForKind(kind: string): NodeVisuals {
    const kindLower = kind.toLowerCase();
    
    // Trigger plugins
    if (kindLower.includes('trigger') || kindLower.includes('webhook')) {
        return {
            icon: 'Zap',
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800'
        };
    }
    
    // AI plugins
    if (kindLower.includes('ai') || kindLower.includes('llm')) {
        return {
            icon: 'Brain',
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-purple-200 dark:border-purple-800'
        };
    }
    
    // Database plugins
    if (kindLower.includes('db') || kindLower.includes('database')) {
        return {
            icon: 'Database',
            color: 'text-cyan-600',
            bg: 'bg-cyan-50 dark:bg-cyan-900/20',
            border: 'border-cyan-200 dark:border-cyan-800'
        };
    }
    
    // Default plugin styling
    return {
        icon: 'Plug',
        color: 'text-green-600',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800'
    };
}
