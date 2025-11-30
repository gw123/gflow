
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { NodeDefinition } from '../types';
import { Registry } from '../registry';
import '../builtins'; // Ensure registration

const CustomNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as NodeDefinition & { label: string, executionStatus?: string };
  const styles = Registry.getVisuals(nodeData.type);
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
