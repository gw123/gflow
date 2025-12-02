
import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Wrench, Code, Globe, HelpCircle } from 'lucide-react';
import { ToolDefinition, WorkflowDefinition } from '../../types';

interface ToolsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowDefinition;
  onSave: (updatedTools: ToolDefinition[]) => void;
}

const ToolsManager: React.FC<ToolsManagerProps> = ({ isOpen, onClose, workflow, onSave }) => {
  const [tools, setTools] = useState<ToolDefinition[]>(workflow.tools || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Editor State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'js' | 'http'>('js');
  const [formContent, setFormContent] = useState('');
  const [formParams, setFormParams] = useState('');

  const resetForm = () => {
      setFormName('');
      setFormDesc('');
      setFormType('js');
      setFormContent('// Return a string or object\nreturn "Result: " + input.query;');
      setFormParams('{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string" }\n  }\n}');
      setEditingIndex(null);
  };

  const handleEdit = (index: number) => {
      const tool = tools[index];
      setEditingIndex(index);
      setFormName(tool.name);
      setFormDesc(tool.description);
      setFormType(tool.type as 'js' | 'http');
      setFormContent(tool.content);
      setFormParams(tool.parameters || '{}');
  };

  const handleDelete = (index: number) => {
      if (confirm("Delete this tool?")) {
          const newTools = tools.filter((_, i) => i !== index);
          setTools(newTools);
          onSave(newTools);
          if (editingIndex === index) resetForm();
      }
  };

  const handleSaveTool = () => {
      if (!formName.trim()) return;
      
      const newTool: ToolDefinition = {
          name: formName,
          description: formDesc,
          type: formType,
          content: formContent,
          parameters: formParams
      };

      let newTools = [...tools];
      if (editingIndex !== null) {
          newTools[editingIndex] = newTool;
      } else {
          newTools.push(newTool);
      }
      
      setTools(newTools);
      onSave(newTools);
      resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl flex h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        
        {/* Left Sidebar: List */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
                    <Wrench size={18} className="text-indigo-500"/> Agent Tools
                </h3>
                <button 
                    onClick={() => { resetForm(); setEditingIndex(-1); }} // -1 indicates new
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> Create Tool
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tools.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic">No tools defined</div>
                ) : (
                    tools.map((tool, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleEdit(idx)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                                editingIndex === idx 
                                ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{tool.name}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{tool.description}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                        {tool.type}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right Content: Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                    {editingIndex === null ? 'Select or Create Tool' : editingIndex === -1 ? 'New Tool' : 'Edit Tool'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={20} />
                </button>
            </div>

            {editingIndex !== null ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name (Unique)</label>
                            <input 
                                type="text" 
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="myCustomTool"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                                <button 
                                    onClick={() => setFormType('js')}
                                    className={`flex-1 py-1 text-xs font-bold rounded flex items-center justify-center gap-1 ${formType === 'js' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                                >
                                    <Code size={12}/> JavaScript
                                </button>
                                <button 
                                    onClick={() => setFormType('http')}
                                    className={`flex-1 py-1 text-xs font-bold rounded flex items-center justify-center gap-1 ${formType === 'http' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                                    disabled title="Coming soon"
                                >
                                    <Globe size={12}/> HTTP (Soon)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Important for Agent)</label>
                        <textarea 
                            value={formDesc}
                            onChange={e => setFormDesc(e.target.value)}
                            className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                            placeholder="Describe what this tool does and when to use it..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parameters (JSON Schema)</label>
                            <textarea 
                                value={formParams}
                                onChange={e => setFormParams(e.target.value)}
                                className="flex-1 w-full p-3 font-mono text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                spellCheck={false}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Implementation (JS)</label>
                            <textarea 
                                value={formContent}
                                onChange={e => setFormContent(e.target.value)}
                                className="flex-1 w-full p-3 font-mono text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                spellCheck={false}
                                placeholder="return 'result';"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <HelpCircle size={10} /> Available: <code>input</code> (args object)
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                        <button 
                            onClick={() => { setEditingIndex(null); }}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveTool}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} /> Save Tool
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Wrench size={48} className="opacity-20 mb-4" />
                    <p className="text-sm">Select a tool to edit or create a new one.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ToolsManager;
