
import { NodePlugin, NodeRunner, NodeVisuals } from './types';
import { Activity } from 'lucide-react';
import { DefaultRunner } from './node_runners/DefaultRunner';

class NodeRegistry {
    private plugins: Map<string, NodePlugin> = new Map();
    private categories: Map<string, string> = new Map([
        ['trigger', 'Workflow triggers to start execution'],
        ['action', 'Basic actions and utilities'],
        ['ai', 'Artificial Intelligence nodes'],
        ['control', 'Flow control logic'],
        ['system', 'System interactions'],
        ['data', 'Database and Storage'],
        ['human', 'Human interactions'],
        ['plugin', 'External Plugins']
    ]);

    register(plugin: NodePlugin) {
        this.plugins.set(plugin.type, plugin);
    }

    get(type: string): NodePlugin | undefined {
        return this.plugins.get(type);
    }

    getRunner(type: string): NodeRunner {
        const plugin = this.plugins.get(type);
        return plugin ? plugin.runner : new DefaultRunner();
    }

    getVisuals(type: string): NodeVisuals {
        const plugin = this.plugins.get(type);
        return plugin ? plugin.visuals : {
            icon: Activity,
            color: 'text-slate-600',
            bg: 'bg-slate-50 dark:bg-slate-900/20',
            border: 'border-slate-200 dark:border-slate-800'
        };
    }

    getAll(): NodePlugin[] {
        return Array.from(this.plugins.values());
    }

    getCategoryDescription(category: string): string {
        return this.categories.get(category) || '';
    }
}

export const Registry = new NodeRegistry();
