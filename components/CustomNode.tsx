

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Zap, Bot, Database, Layers, File, Box, 
  Settings, GitBranch, Cloud, MessageSquare, 
  Server, Bell, Shuffle, Code, Bug, Terminal,
  Globe, Clock, Search, CheckCircle, AlertCircle, Loader2,
  Play, Pause, AlertTriangle, Plug
} from 'lucide-react';
import { NodeDefinition } from '../types';

// Map node types to icons and colors
const getNodeStyles = (type: string) => {
  const styles = {
    // Trigger / Start
    webhook: { icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    manual: { icon: Play, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    timer: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },

    // AI / LLM
    chatgpt: { icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
    tts: { icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
    agent: { icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
    prompt_template: { icon: File, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
    ai_low_code: { icon: SparklesIcon, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800' },

    // Database / Data
    mysql: { icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
    pg: { icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
    redis: { icon: Layers, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    feishu_bitable: { icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },

    // Code / Logic
    js: { icon: Code, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    code_search: { icon: Search, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    if: { icon: Shuffle, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    switch: { icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    loop: { icon: Shuffle, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },

    // System / Ops
    docker: { icon: Box, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800' },
    docker_compose: { icon: Box, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800' },
    execute_command: { icon: Terminal, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' },
    git: { icon: GitBranch, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
    
    // Integrations
    feishu_custom_robot: { icon: Bell, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
    
    // Plugins
    grpc_plugin: { icon: Plug, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },

    // Default
    default: { icon: Zap, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' }
  };

  return styles[type as keyof typeof styles] || styles.default;
};

// Helper icon for missing imports
const SparklesIcon = ({ size = 24, className, strokeWidth = 2 }: { size?: number | string, className?: string, strokeWidth?: number | string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const CustomNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as NodeDefinition & { executionStatus?: 'running' | 'success' | 'error' | 'skipped' };
  const style = getNodeStyles(nodeData.type);
  const Icon = style.icon;

  // Determine border and status visuals
  let borderColorClass = selected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-transparent";
  let statusIcon = null;
  let statusGlow = "";

  if (nodeData.executionStatus === 'running') {
    borderColorClass = "border-blue-500 ring-2 ring-blue-500/40";
    statusIcon = <Loader2 size={14} className="animate-spin text-blue-500" />;
    statusGlow = "shadow-[0_0_15px_rgba(59,130,246,0.3)]";
  } else if (nodeData.executionStatus === 'success') {
    borderColorClass = "border-green-500 ring-1 ring-green-500/20";
    statusIcon = <CheckCircle size={14} className="text-green-500" />;
  } else if (nodeData.executionStatus === 'error') {
    borderColorClass = "border-red-500 ring-1 ring-red-500/20";
    statusIcon = <AlertCircle size={14} className="text-red-500" />;
  } else if (!selected) {
    borderColorClass = "border-slate-200 dark:border-slate-700";
  }

  return (
    <div className={`relative group min-w-[240px] rounded-xl bg-white dark:bg-slate-800 border-2 transition-all duration-200 ${borderColorClass} ${statusGlow} shadow-sm hover:shadow-md`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3.5 !h-3.5 !-left-[9px] !bg-slate-400 !border-2 !border-white dark:!border-slate-800 transition-transform hover:scale-125" 
      />

      {/* Header Area */}
      <div className="flex items-start gap-3 p-3 pb-2">
        {/* Icon Container */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${style.bg} ${style.color} border ${style.border}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        
        {/* Title & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate pr-2" title={nodeData.name}>
              {nodeData.name}
            </h3>
            {statusIcon}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-700/50 px-1.5 py-px rounded-sm border border-slate-100 dark:border-slate-700">
                {nodeData.type}
            </span>
          </div>
        </div>
      </div>

      {/* Body Area */}
      <div className="px-3 pb-3 pt-1">
         {/* Description or Params Preview */}
         <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
            {nodeData.desc || (
              <span className="italic opacity-50">No description provided</span>
            )}
         </p>
         
         {/* Footer Info */}
         {(nodeData.executionStatus === 'running' || nodeData.executionStatus === 'success') && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                <span>Status:</span>
                <span className={`font-medium capitalize ${nodeData.executionStatus === 'running' ? 'text-blue-500' : 'text-green-500'}`}>
                    {nodeData.executionStatus}
                </span>
            </div>
         )}
      </div>

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3.5 !h-3.5 !-right-[9px] !bg-slate-400 !border-2 !border-white dark:!border-slate-800 transition-transform hover:scale-125" 
      />
    </div>
  );
};

export default memo(CustomNode);