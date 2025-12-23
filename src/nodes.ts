
import { NodeDefinition } from './types';
import { api } from './api/client';
import { Registry } from './registry';
import './builtins'; // Ensure plugins are loaded temporarily

export interface TemplateCategory {
  description?: string;
  templates: NodeDefinition[];
}

export let TEMPLATE_LIBRARY: Record<string, TemplateCategory> = {};
export let NODE_TEMPLATES: Record<string, NodeDefinition> = {};

// Function to fetch nodes from API
export async function fetchNodesFromAPI(params: any = {}): Promise<void> {
  try {
    const response = await api.getNodeTemplates();
    
    // Update the global variables with API data
    // TEMPLATE_LIBRARY = response.data.categories || {};
    // NODE_TEMPLATES = response.data.allTemplates || {};
    
    // Log success
    console.log('Nodes fetched successfully from API:', {
      categories: Object.keys(TEMPLATE_LIBRARY),
      templates: Object.keys(NODE_TEMPLATES).length
    });
  } catch (error) {
    console.error('Failed to fetch nodes from API, falling back to local registry:', error);
    
    // Fallback to local registry if API fails
    loadNodesFromLocalRegistry();
  }
}

// Load nodes from local registry as fallback
function loadNodesFromLocalRegistry(): void {
  const allPlugins = Registry.getAll();
  
  // Reset to empty
  TEMPLATE_LIBRARY = {};
  NODE_TEMPLATES = {};
  
  allPlugins.forEach(plugin => {
    // 1. Populate NODE_TEMPLATES (Flat Map)
    NODE_TEMPLATES[plugin.type] = plugin.template;

    // 2. Populate TEMPLATE_LIBRARY (Grouped)
    if (!TEMPLATE_LIBRARY[plugin.category]) {
      TEMPLATE_LIBRARY[plugin.category] = {
        description: Registry.getCategoryDescription(plugin.category),
        templates: []
      };
    }
    TEMPLATE_LIBRARY[plugin.category].templates.push(plugin.template);
  });
  
  console.log('Nodes loaded from local registry:', {
    categories: Object.keys(TEMPLATE_LIBRARY),
    templates: Object.keys(NODE_TEMPLATES).length
  });
}

/**
 * Refresh TEMPLATE_LIBRARY and NODE_TEMPLATES from Registry
 * Call this after loading server resources
 */
export function refreshNodeLibrary(): void {
  console.log('[Node Library] Refreshing from Registry...');
  loadNodesFromLocalRegistry();
}

// Initial load from local registry
const initialPlugins = Registry.getAll();
initialPlugins.forEach(plugin => {
  NODE_TEMPLATES[plugin.type] = plugin.template;
  if (!TEMPLATE_LIBRARY[plugin.category]) {
    TEMPLATE_LIBRARY[plugin.category] = {
      description: Registry.getCategoryDescription(plugin.category),
      templates: []
    };
  }
  TEMPLATE_LIBRARY[plugin.category].templates.push(plugin.template);
});
