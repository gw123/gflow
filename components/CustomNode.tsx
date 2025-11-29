
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Zap, Bot, Database, Layers, File, Box, 
  Settings, GitBranch, Cloud, MessageSquare, 
  Server, Bell, Shuffle, Code, Bug, Terminal,
  Globe, Clock, Search, CheckCircle, AlertCircle, Loader2,
  Play, Video, Info, User, Plug, Activity, Volume2, Image
} from 'lucide-react';
import { NodeDefinition } from '../types';

const getNodeStyles = (type: string) => {
  const styles: Record<string, any> = {
    webhook: { icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    manual: { icon: Play, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    timer: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    media_capture: { icon: Video, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
    play_media: { icon: Volume2, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
    
    http: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    js: { icon: Code, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
    code_search: { icon: Search, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
    
    chatgpt: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    ai_image_gen: { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    tts: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    agent: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    ai_low_code: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    
    if: { icon: GitBranch, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' },
    loop: { icon: Shuffle, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' },
    switch: { icon: Shuffle, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' },
    
    user_interaction: { icon: User, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
    
    mysql: { icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
    pg: { icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
    redis: { icon: Layers, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    
    execute_command: { icon: Terminal, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' },
    docker: { icon: Box, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    
    grpc_plugin: { icon: Plug, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },

    default: { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' }
  };
  return styles[type] || styles.default;
};

const CustomNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as NodeDefinition & { label: string, executionStatus?: string };
  const styles = getNodeStyles(nodeData.type);
  const Icon = styles.icon;

  const statusColor = 
      nodeData.executionStatus === 'running' ? 'ring-2 ring-blue-500 ring-offset-2' :
      nodeData.executionStatus === 'success' ? 'ring-2 ring-green-500 ring-offset-2' :
      nodeData.executionStatus === 'error' ? 'ring-2 ring-red-500 ring-offset-2' :
      selected ? 'ring-2 ring-blue-400' : '';

  return (
    <div className={`relative group min-w-[200px] rounded-lg border shadow-sm transition-all ${styles.bg} ${styles.border} ${statusColor} hover:shadow-md bg-white dark:bg-slate-800`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400 !border-2 !border-white dark:!border-slate-900" />
      
      <div className="flex items-center gap-3 p-3">
        <div className={`p-2 rounded-md bg-white dark:bg-slate-900 shadow-sm ${styles.color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {nodeData.label || nodeData.name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {nodeData.type}
          </div>
        </div>
        {nodeData.executionStatus === 'running' && <Loader2 size={14} className="animate-spin text-blue-500" />}
        {nodeData.executionStatus === 'success' && <CheckCircle size={14} className="text-green-500" />}
        {nodeData.executionStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400 !border-2 !border-white dark:!border-slate-900" />
    </div>
  );
};

export default memo(CustomNode);
