
import { NodeDefinition } from './types';
import { Registry } from './registry';
import './builtins'; // Ensure plugins are loaded

export interface TemplateCategory {
  description?: string;
  templates: NodeDefinition[];
}

export const TEMPLATE_LIBRARY: Record<string, TemplateCategory> = {};
export const NODE_TEMPLATES: Record<string, NodeDefinition> = {};

// Populate from Registry
const allPlugins = Registry.getAll();

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
