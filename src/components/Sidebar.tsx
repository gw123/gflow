
import React from 'react';
import { TEMPLATE_LIBRARY, NODE_TEMPLATES } from '../nodes';
import { IconMap } from './icons';
import { Terminal } from 'lucide-react';
import { Registry } from '../registry';
import { api } from '../api/client';

// Map category keys to IconMap keys
const CATEGORY_ICON_NAMES: Record<string, string> = {
  trigger: 'Zap',
  llm: 'Bot',
  database: 'Database',
  cache: 'Layers',
  file: 'File',
  docker: 'Box',
  system: 'Settings',
  git: 'GitBranch',
  storage: 'Cloud',
  feishu: 'MessageSquare',
  mq: 'Server',
  notification: 'Bell',
  control: 'Shuffle',
  code: 'Code',
  debug: 'Bug',
  plugin: 'Plug',
  action: 'Play',
  ai: 'Bot',
  data: 'Database',
  human: 'User'
};

const Sidebar = () => {
  const [library, setLibrary] = React.useState(TEMPLATE_LIBRARY);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Function to refresh library from Registry
  const refreshLibrary = React.useCallback(() => {
    console.log('[Sidebar] Refreshing node library...');
    const allPlugins = Registry.getAll();
    const newLibrary: Record<string, any> = {};
    
    allPlugins.forEach(plugin => {
      // Update NODE_TEMPLATES for each plugin
      NODE_TEMPLATES[plugin.type] = plugin.template;
      
      // Group by category for library
      if (!newLibrary[plugin.category]) {
        newLibrary[plugin.category] = {
          description: Registry.getCategoryDescription(plugin.category),
          templates: []
        };
      }
      newLibrary[plugin.category].templates.push(plugin.template);
    });
    
    console.log('[Sidebar] Library refreshed:', {
      categories: Object.keys(newLibrary),
      totalNodes: allPlugins.length,
      nodeTemplatesCount: Object.keys(NODE_TEMPLATES).length
    });
    
    setLibrary(newLibrary);
    setRefreshKey(prev => prev + 1);
  }, []);

  // Initial load and periodic refresh
  React.useEffect(() => {
    // Initial refresh
    refreshLibrary();
    
    // Listen for custom event to refresh
    const handleRefresh = () => {
      console.log('[Sidebar] Received refresh event');
      refreshLibrary();
    };
    
    window.addEventListener('refreshNodeLibrary', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshNodeLibrary', handleRefresh);
    };
  }, [refreshLibrary]);

  React.useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const result = await api.getPlugins();
        const data = result.data || [];

        setLibrary(prevLibrary => {
          const newLibrary = { ...prevLibrary };

          data.forEach((plugin: any) => {
            // Transform plugin data into template format
            const pluginType = `plugin_${plugin.id}`;
            const template = {
              name: plugin.name,
              type: pluginType,
              description: plugin.description || '',
              category: 'plugin',
              inputs: {},
              outputs: {}
            };

            // Register the plugin as a node type
            if (!Registry.get(pluginType)) {
              Registry.register({
                type: pluginType,
                name: plugin.name,
                category: 'plugin',
                icon: 'Plug',
                template,
                runner: {} as any // Stub runner for frontend display purposes
              });
            }

            const cat = 'plugin';
            if (!newLibrary[cat]) {
              newLibrary[cat] = { description: 'Dynamic Plugins', templates: [] };
            }

            // Check for duplicates
            if (!newLibrary[cat].templates.find((t: any) => t.type === pluginType)) {
              newLibrary[cat].templates.push(template);
            }

            // Update global NODE_TEMPLATES so App.tsx onDrop can find the definition
            NODE_TEMPLATES[pluginType] = template;
          });
          return newLibrary;
        });
      } catch (err) {
        console.error('Failed to load plugins:', err);
      }
    };

    fetchPlugins();
    const interval = setInterval(fetchPlugins, 120000);
    return () => clearInterval(interval);
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Component Library</h2>
        <p className="text-xs text-gray-500 mt-1">Drag and drop nodes to build workflow</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-6 scrollbar-thin">
        {Object.entries(library).map(([key, category]: [string, any]) => {
          const iconName = CATEGORY_ICON_NAMES[key] || 'Terminal';
          const CategoryIcon = IconMap[iconName] || Terminal;

          return (
            <div key={key} className="px-2">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                <CategoryIcon size={15} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{key}</h3>
              </div>

              {/* Description */}
              {category.description && (
                <p className="text-[10px] text-gray-400 mb-3 px-1 leading-tight">{category.description}</p>
              )}

              <div className="grid grid-cols-1 gap-2">
                {category.templates.map((template: any) => {
                  const visuals = Registry.getVisuals(template.type);
                  // Fallback to finding it in the nodePlugin if Registry.getVisuals returns undefined (which it shouldn't if we registered it)
                  // The Registry.getVisuals implementation might depend on how we registered it.

                  const NodeIcon = visuals ? (IconMap[visuals.icon] || CategoryIcon) : CategoryIcon;

                  return (
                    <div
                      key={template.name}
                      onDragStart={(event) => onDragStart(event, template.type)}
                      draggable
                      className="flex items-start gap-3 p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                      <div className="mt-0.5 p-1.5 bg-slate-50 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <NodeIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {template.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate opacity-80">
                          {template.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
