
import React, { useMemo } from 'react';
import { useNodes, useViewport } from 'reactflow';
import { NODE_TEMPLATES } from '../../nodes';
import { NODE_WIDTH } from '../../utils';
import { IconMap } from './icons';
import { Info } from 'lucide-react';
import { NodeDefinition } from '../../types';
import { Registry } from '../../registry';

const NodeInfoTooltip = () => {
  const nodes = useNodes();
  const { x, y, zoom } = useViewport();

  const selectedNode = useMemo(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length !== 1) return null;
    return selected[0];
  }, [nodes]);

  if (!selectedNode) return null;

  const nodeData = selectedNode.data as unknown as NodeDefinition;
  const template = NODE_TEMPLATES[nodeData.type];
  
  // Resolve visual config
  const visuals = Registry.getVisuals(nodeData.type);
  const Icon = IconMap[visuals.icon] || Info;

  // Calculate position to render directly above the node in the canvas coordinate system
  const top = selectedNode.position.y - 10; 
  const left = selectedNode.position.x + NODE_WIDTH / 2;

  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(${left}px, ${top}px) translate(-50%, -100%)`,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
      className="mb-2"
    >
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                    <Icon size={14} />
                </span>
                <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{nodeData.name}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{nodeData.type}</span>
                </div>
            </div>

            <div className="space-y-2">
                {nodeData.desc && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {nodeData.desc}
                    </p>
                )}
                {!nodeData.desc && template?.category && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        {template.category}
                    </p>
                )}

                {/* Contextual Details based on type */}
                {nodeData.type === 'webhook' && nodeData.parameters?.path && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded p-1.5 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase mb-0.5 font-bold">Path</span>
                        <code className="text-[10px] font-mono text-blue-600 dark:text-blue-400 break-all">/{nodeData.parameters.path}</code>
                    </div>
                )}
                 {nodeData.type === 'mysql' && nodeData.parameters?.sql && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded p-1.5 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase mb-0.5 font-bold">SQL Query</span>
                        <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400 line-clamp-3">{nodeData.parameters.sql}</code>
                    </div>
                )}
            </div>

            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800/90 border-r border-b border-slate-200 dark:border-slate-700 rotate-45"></div>
        </div>
    </div>
  );
};

export default NodeInfoTooltip;
