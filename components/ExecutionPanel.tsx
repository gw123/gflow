
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Terminal, Activity, ChevronRight, Layers, ArrowRight, FileJson, FileText } from 'lucide-react';
import { WorkflowExecutionState, NodeExecutionResult } from '../types';

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: WorkflowExecutionState;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ isOpen, onClose, state }) => {
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'logs' | 'error'>('output');

  // Reset selection when panel opens/closes or state resets
  useEffect(() => {
      if (!isOpen) setSelectedNodeName(null);
  }, [isOpen]);

  // Auto-select the latest running/finished node if nothing is selected
  useEffect(() => {
      if (state.isRunning && !selectedNodeName) {
          const latest = Object.values(state.nodeResults).sort((a,b) => b.startTime - a.startTime)[0];
          if (latest) setSelectedNodeName(latest.nodeName);
      }
  }, [state, selectedNodeName]);

  if (!isOpen) return null;

  const sortedResults = Object.values(state.nodeResults).sort((a, b) => a.startTime - b.startTime);
  const selectedResult = selectedNodeName ? state.nodeResults[selectedNodeName] : null;

  const renderJson = (data: any) => {
      if (data === undefined || data === null) return <span className="text-slate-500 italic">Empty</span>;
      return (
          <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 overflow-auto max-h-[300px]">
              {JSON.stringify(data, null, 2)}
          </pre>
      );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-96 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Activity size={16} className={state.isRunning ? "text-blue-500 animate-pulse" : "text-slate-400"} />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Execution Console</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${state.isRunning ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                {state.isRunning ? 'Running' : 'Finished'}
            </span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition text-slate-500">
            <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Sidebar List */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-900">
            {/* System Logs Option */}
            <div 
                onClick={() => setSelectedNodeName(null)}
                className={`p-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors flex items-center gap-2 ${!selectedNodeName ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'}`}
            >
                <Terminal size={14} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">System Logs</span>
            </div>

            {sortedResults.length === 0 && !state.isRunning && (
                 <div className="p-4 text-center text-xs text-slate-400 italic">
                    No execution data available.
                 </div>
            )}

            {sortedResults.map((res) => (
                <div 
                    key={res.nodeName} 
                    onClick={() => setSelectedNodeName(res.nodeName)}
                    className={`p-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all group ${
                        selectedNodeName === res.nodeName 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {res.status === 'running' && <Clock size={14} className="text-blue-500 animate-spin flex-shrink-0" />}
                            {res.status === 'success' && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                            {res.status === 'error' && <AlertCircle size={14} className="text-red-500 flex-shrink-0" />}
                            <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate">{res.nodeName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                            {res.endTime ? `${res.endTime - res.startTime}ms` : '...'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pl-6">
                        <span>{res.status}</span>
                        <ChevronRight size={12} className={`transition-transform ${selectedNodeName === res.nodeName ? 'translate-x-1 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                </div>
            ))}
        </div>

        {/* Right: Details View */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
            
            {selectedResult ? (
                /* Node Details Mode */
                <div className="flex-1 flex flex-col h-full">
                    {/* Detail Header */}
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <div className={`p-1 rounded ${selectedResult.status === 'success' ? 'bg-green-100 text-green-600' : selectedResult.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                 <Layers size={16}/>
                             </div>
                             <div>
                                 <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedResult.nodeName}</h4>
                                 <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                     {new Date(selectedResult.startTime).toLocaleTimeString()}
                                     <ArrowRight size={10} /> 
                                     {selectedResult.endTime ? new Date(selectedResult.endTime).toLocaleTimeString() : 'Running...'}
                                 </div>
                             </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex ml-auto bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg">
                            {(['input', 'output', 'logs', 'error'] as const).map(tab => {
                                if (tab === 'error' && !selectedResult.error) return null;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Detail Body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'input' && (
                             <div className="animate-in fade-in duration-200">
                                 <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">
                                     <ArrowRight size={14} className="rotate-45" /> Inputs Parameters
                                 </div>
                                 {renderJson(selectedResult.inputs)}
                             </div>
                        )}

                        {activeTab === 'output' && (
                             <div className="animate-in fade-in duration-200">
                                 <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">
                                     <FileJson size={14} /> Execution Output
                                 </div>
                                 {renderJson(selectedResult.output)}
                             </div>
                        )}

                        {activeTab === 'logs' && (
                             <div className="animate-in fade-in duration-200 h-full flex flex-col">
                                 <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">
                                     <FileText size={14} /> Node Logs
                                 </div>
                                 <div className="flex-1 bg-slate-900 text-slate-300 p-3 rounded-md font-mono text-xs overflow-auto border border-slate-700">
                                     {selectedResult.logs.length === 0 ? (
                                         <span className="text-slate-600 italic">No logs generated.</span>
                                     ) : (
                                         selectedResult.logs.map((log, i) => (
                                             <div key={i} className="mb-1 break-all border-l-2 border-transparent hover:border-blue-500 pl-1 hover:bg-white/5">
                                                 {log}
                                             </div>
                                         ))
                                     )}
                                 </div>
                             </div>
                        )}

                        {activeTab === 'error' && selectedResult.error && (
                             <div className="animate-in fade-in duration-200">
                                 <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide">
                                     <AlertCircle size={14} /> Error Details
                                 </div>
                                 <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200 text-sm font-mono break-all">
                                     {selectedResult.error}
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Global System Logs Mode */
                <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-200 font-mono text-xs">
                    <div className="px-4 py-2 border-b border-slate-800 text-slate-400 flex items-center gap-2 bg-slate-950/50">
                        <Terminal size={14} /> System Logs
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {state.logs.map((log, i) => (
                            <div key={i} className="break-all opacity-90 hover:opacity-100 font-mono">
                                {log}
                            </div>
                        ))}
                        <div className="h-4" /> {/* Spacer */}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionPanel;
