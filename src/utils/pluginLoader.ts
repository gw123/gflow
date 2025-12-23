/**
 * Plugin Loader Utilities
 * 
 * Provides helper functions for loading and managing dynamic plugins and node templates
 */

import { loadAllServerResources, loadServerNodeTemplates, loadServerPlugins } from '../builtins';
import { Registry } from '../registry';
import { api } from '../api/client';

/**
 * Reload all server resources (node templates + gRPC plugins)
 * Useful after adding/removing plugins or templates in the management pages
 */
export async function reloadAllServerResources(): Promise<void> {
  const headers = api.getAuthHeaders();
  await loadAllServerResources(headers);
  // Event is triggered inside loadAllServerResources
}

/**
 * Reload only node templates from server
 */
export async function reloadServerNodeTemplates(): Promise<void> {
  const headers = api.getAuthHeaders();
  await loadServerNodeTemplates(headers);
  // Event is triggered inside loadServerNodeTemplates
}

/**
 * Reload only gRPC plugins from server
 */
export async function reloadServerPlugins(): Promise<void> {
  const headers = api.getAuthHeaders();
  await loadServerPlugins(headers);
  // Event is triggered inside loadServerPlugins
}

/**
 * Manually trigger UI refresh
 * Useful when you know Registry has changed but want to force a refresh
 */
export function triggerNodeLibraryRefresh(): void {
  console.log('[Plugin Loader] Manually triggering UI refresh...');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshNodeLibrary'));
  }
}

/**
 * Get total plugin count (built-in + server)
 */
export function getTotalPluginCount(): number {
  return Registry.getAll().length;
}

/**
 * Get plugins grouped by category
 */
export function getPluginsByCategory() {
  const plugins = Registry.getAll();
  return plugins.reduce((acc, plugin) => {
    if (!acc[plugin.category]) {
      acc[plugin.category] = [];
    }
    acc[plugin.category].push(plugin);
    return acc;
  }, {} as Record<string, typeof plugins>);
}

/**
 * Check if a plugin type is from server (dynamic) or built-in
 */
export function isServerPlugin(pluginType: string): boolean {
  return pluginType.startsWith('grpc_plugin_');
}

/**
 * Check if a node type is a server template
 */
export function isServerTemplate(nodeType: string): boolean {
  // Server templates use standard type names (mysql, redis, etc.)
  // Built-in plugins are registered first, so we can check if they were overridden
  const plugin = Registry.get(nodeType);
  return plugin !== undefined && !nodeType.startsWith('grpc_plugin_');
}

/**
 * Get plugin statistics
 */
export function getPluginStats() {
  const all = Registry.getAll();
  const grpcPlugins = all.filter(p => isServerPlugin(p.type));
  const builtInPlugins = all.filter(p => !isServerPlugin(p.type));
  
  return {
    total: all.length,
    builtIn: builtInPlugins.length,
    grpcPlugins: grpcPlugins.length,
    byCategory: getPluginsByCategory()
  };
}
