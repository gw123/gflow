

import React from 'react';
import { 
  Zap, Bot, Database, Layers, File, Box, 
  Settings, GitBranch, Cloud, MessageSquare, 
  Server, Bell, Shuffle, Code, Bug, Terminal,
  Globe, Clock, Search, Plug
} from 'lucide-react';
import { TEMPLATE_LIBRARY } from '../nodes';

// Map category keys to Lucide icons
const CATEGORY_ICONS: Record<string, any> = {
  trigger: Zap,
  llm: Bot,
  database: Database,
  cache: Layers,
  file: File,
  docker: Box,
  system: Settings,
  git: GitBranch,
  storage: Cloud,
  feishu: MessageSquare,
  mq: Server,
  notification: Bell,
  control: Shuffle,
  code: Code,
  debug: Bug,
  plugin: Plug
};

// Fallback icons for specific node types if needed, 
// though we mostly rely on category icons now or generic ones.
const NODE_ICONS: Record<string, any> = {
  webhook: Globe,
  http: Globe,
  timer: Clock,
  chatgpt: Bot,
  tts: Bot,
  agent: Bot,
  mysql: Database,
  pg: Database,
  redis: Layers,
  docker: Box,
  js: Code,
  code_search: Search,
  debug: Bug,
  grpc_plugin: Plug
};

const Sidebar = () => {
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
        {Object.entries(TEMPLATE_LIBRARY).map(([key, category]) => {
           const CategoryIcon = CATEGORY_ICONS[key] || Terminal;

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
                  {category.templates.map((template) => {
                    // Use specific icon or fallback to category icon
                    const NodeIcon = NODE_ICONS[template.type] || CategoryIcon;
                    
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