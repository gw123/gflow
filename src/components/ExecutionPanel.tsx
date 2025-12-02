
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Terminal, Activity, ChevronRight, Layers, ArrowRight, FileJson, FileText, Play, StepForward, PauseCircle, Send, User, Image as ImageIcon, Download } from 'lucide-react';
import { PendingInputConfig, InputFieldDefinition, NodeExecutionResult } from '../../types';
import { useExecutionStore, useUIStore } from '../../stores';

interface ExecutionPanelProps {
  onNextStep?: () => void;
  onResume?: () => void;
  onSubmitInput?: (data: any) => void;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ onNextStep, onResume, onSubmitInput }) => {
  const { executionState } = useExecutionStore();
  const { executionPanelOpen, setPanelOpen } = useUIStore();
  
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'logs' | 'error'>('output');
  
  // Input Form State
  const [inputFormData, setInputFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isOpen = executionPanelOpen;
  const state = executionState;

  // Reset selection when panel opens/closes or state resets
  useEffect(() => {
      if (!isOpen) setSelectedNodeName(null);
  }, [isOpen]);

  // Auto-select the latest running/finished node if nothing is selected
  useEffect(() => {
      if (state.isRunning && !selectedNodeName) {
          // If waiting for input, prioritize that node
          if (state.waitingForInput && state.pendingInputConfig) {
             setSelectedNodeName(state.pendingInputConfig.nodeName);
          } else {
             const results = Object.values(state.nodeResults) as NodeExecutionResult[];
             const latest = results.sort((a,b) => b.startTime - a.startTime)[0];
             if (latest) setSelectedNodeName(latest.nodeName);
          }
      }
  }, [state, selectedNodeName]);
  
  // Initialize form data when waiting starts
  useEffect(() => {
      if (state.waitingForInput && state.pendingInputConfig) {
          const init: Record<string, any> = {};
          state.pendingInputConfig.fields.forEach(f => {
              init[f.key] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'boolean' ? false : '');
          });
          setInputFormData(init);
          setValidationErrors({});
          // Also select this node
          setSelectedNodeName(state.pendingInputConfig.nodeName);
      }
  }, [state.waitingForInput, state.pendingInputConfig]);

  if (!isOpen) return null;

  const results = Object.values(state.nodeResults) as NodeExecutionResult[];
  const sortedResults = results.sort((a, b) => a.startTime - b.startTime);
  const selectedResult = selectedNodeName ? state.nodeResults[selectedNodeName] : null;

  const validateField = (field: InputFieldDefinition, value: any): string | null => {
     if (field.required && (value === undefined || value === null || value === '')) {
         return "This field is required";
     }
     if (field.validationRegex && typeof value === 'string') {
         try {
             const regex = new RegExp(field.validationRegex);
             if (!regex.test(value)) {
                 return field.validationMessage || "Invalid format";
             }
         } catch(e) {
             // Invalid regex config, ignore or log
         }
     }
     return null;
  };

  const handleInputSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate all fields
      if (state.pendingInputConfig) {
          const errors: Record<string, string> = {};
          state.pendingInputConfig.fields.forEach(field => {
              const error = validateField(field, inputFormData[field.key]);
              if (error) errors[field.key] = error;
          });
          
          if (Object.keys(errors).length > 0) {
              setValidationErrors(errors);
              return;
          }
      }

      if (onSubmitInput) {
          onSubmitInput(inputFormData);
      }
  };

  const handleFieldChange = (key: string, value: any, field?: InputFieldDefinition) => {
      setInputFormData(prev => ({ ...prev, [key]: value }));
      // Clear error on change
      if (validationErrors[key]) {
          const newErrors = { ...validationErrors };
          delete newErrors[key];
          setValidationErrors(newErrors);
      }
  };

  const renderJson = (data: any) => {
      if (data === undefined || data === null) return <span className="text-slate-500 italic">Empty</span>;
      
      const replacer = (key: string, value: any) => {
          if (typeof value === 'string' && value.length > 200) {
              return value.substring(0, 50) + `... [${value.length} chars truncated]`;
          }
          return value;
      };

      return (
          <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 overflow-auto max-h-[300px]">
              {JSON.stringify(data, replacer, 2)}
          </pre>
      );
  };
  
  const renderInputForm = (config: PendingInputConfig) => {
      return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
              <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <div className="p-2.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                          <User size={20} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{config.title}</h3>
                          {config.description && <p className="text-sm text-slate-500 dark:text-slate-400">{config.description}</p>}
                      </div>
                  </div>
                  
                  <form onSubmit={handleInputSubmit} className="space-y-4">
                      {config.fields.map(field => {
                          const inputStyle = field.style || {};

                          return (
                          <div key={field.key}>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>
                              
                              {field.description && <p className="text-xs text-slate-500 mb-2">{field.description}</p>}

                              {field.type === 'boolean' ? (
                                  <div className="flex items-center gap-2 mt-2">
                                     <button
                                        type="button"
                                        onClick={() => handleFieldChange(field.key, !inputFormData[field.key], field)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${inputFormData[field.key] ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        style={inputFormData[field.key] ? inputStyle : {}}
                                     >
                                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inputFormData[field.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                     </button>
                                     <span className="text-sm text-slate-600 dark:text-slate-400">{inputFormData[field.key] ? 'Yes' : 'No'}</span>
                                  </div>
                              ) : field.type === 'select' && field.options ? (
                                  <select
                                      value={inputFormData[field.key]}
                                      onChange={(e) => handleFieldChange(field.key, e.target.value, field)}
                                      className={`w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors[field.key] ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                      style={inputStyle}
                                  >
                                      {field.options.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                  </select>
                              ) : field.type === 'text' ? (
                                  <textarea
                                      value={inputFormData[field.key]}
                                      onChange={(e) => handleFieldChange(field.key, e.target.value, field)}
                                      className={`w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] ${validationErrors[field.key] ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                      required={field.required}
                                      placeholder={field.placeholder}
                                      style={inputStyle}
                                  />
                              ) : (
                                  <input 
                                      type={field.type === 'number' ? 'number' : field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                                      value={inputFormData[field.key]}
                                      onChange={(e) => handleFieldChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value, field)}
                                      className={`w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors[field.key] ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                      required={field.required}
                                      placeholder={field.placeholder}
                                      style={inputStyle}
                                  />
                              )}
                              
                              {validationErrors[field.key] && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                      <AlertCircle size={10} /> {validationErrors[field.key]}
                                  </p>
                              )}
                          </div>
                      )})}
                      
                      <div className="pt-2">
                          <button 
                             type="submit" 
                             className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                          >
                             <Send size={16} /> Submit Response
                          </button>
                      </div>
                  </form>
              </div>
          </div>
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
            
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${
                    state.waitingForInput
                    ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 animate-pulse'
                    : state.isPaused 
                    ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                    : state.isRunning 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' 
                        : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}>
                    {state.waitingForInput ? <User size={10} /> : state.isPaused ? <PauseCircle size={10} /> : null}
                    {state.waitingForInput ? 'Waiting for Input' : state.isPaused ? 'Paused' : state.isRunning ? 'Running' : 'Finished'}
                </span>

                {state.isPaused && !state.waitingForInput && (
                    <div className="flex items-center gap-1 ml-2 animate-in fade-in slide-in-from-left-2">
                        <button 
                            onClick={onNextStep} 
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                            title="Execute Next Step"
                        >
                            <StepForward size={12}/> Next
                        </button>
                        <button 
                            onClick={onResume} 
                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-bold transition-colors"
                            title="Resume Full Execution"
                        >
                            <Play size={12}/> Resume
                        </button>
                    </div>
                )}
            </div>
        </div>
        <button onClick={() => setPanelOpen('executionPanelOpen', false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition text-slate-500">
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
            
            {/* Show Form If Waiting for Input AND Selected Node matches config node */}
            {state.waitingForInput && state.pendingInputConfig && selectedNodeName === state.pendingInputConfig.nodeName ? (
                renderInputForm(state.pendingInputConfig)
            ) : selectedResult ? (
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
                                 
                                 {/* Image Preview */}
                                 {selectedResult.output?.image && typeof selectedResult.output.image === 'string' && (
                                     <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                         <div className="flex items-center justify-between mb-2">
                                             <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><ImageIcon size={12}/> Generated Image</p>
                                             <a 
                                                href={selectedResult.output.image} 
                                                download={`image_${Date.now()}.png`}
                                                className="text-[10px] flex items-center gap-1 text-blue-600 hover:underline"
                                             >
                                                 <Download size={10} /> Download
                                             </a>
                                         </div>
                                         <div className="flex justify-center bg-white dark:bg-black/20 p-2 rounded border border-slate-200 dark:border-slate-800">
                                             <img 
                                                src={selectedResult.output.image} 
                                                alt="Generated Result" 
                                                className="max-w-full h-auto rounded shadow-sm max-h-[300px] object-contain"
                                             />
                                         </div>
                                     </div>
                                 )}

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
