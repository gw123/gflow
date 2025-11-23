
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, HelpCircle, ArrowRight } from 'lucide-react';
import { Edge } from 'reactflow';

interface ConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  edge: Edge | null;
  onSave: (edgeId: string, conditions: string[]) => void;
  onDelete: (edgeId: string) => void;
}

const ConditionModal: React.FC<ConditionModalProps> = ({ isOpen, onClose, edge, onSave, onDelete }) => {
  const [conditions, setConditions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && edge) {
      const data = edge.data?.when;
      if (Array.isArray(data)) {
        setConditions([...data]);
      } else if (typeof data === 'string') {
        setConditions([data]);
      } else {
        setConditions([]);
      }
    }
  }, [isOpen, edge]);

  const handleAdd = () => setConditions([...conditions, ""]);
  
  const handleChange = (index: number, val: string) => {
    const newConds = [...conditions];
    newConds[index] = val;
    setConditions(newConds);
  };

  const handleRemove = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!edge) return;
    // Filter empty
    const final = conditions.map(c => c.trim()).filter(c => !!c);
    onSave(edge.id, final);
  };

  if (!isOpen || !edge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Connection Settings</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Visual Indicator */}
            <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {edge.source}
                </div>
                <ArrowRight size={16} className="text-slate-400" />
                <div className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {edge.target}
                </div>
            </div>

            {/* Conditions */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        Conditions (AND)
                    </label>
                    <button 
                        onClick={handleAdd}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                        <Plus size={12} /> Add Condition
                    </button>
                </div>
                
                {conditions.length === 0 ? (
                    <div className="text-center p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 text-xs italic">
                        No conditions set. This connection will always trigger.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conditions.map((cond, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={cond}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    placeholder="e.g. {{ $P.status == 'success' }}"
                                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                />
                                <button 
                                    onClick={() => handleRemove(idx)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-2 flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                    <HelpCircle size={12} className="mt-0.5 text-blue-500" />
                    <p>Conditions determine if the flow continues to the next node. Use <code>{'{{ variable }}'}</code> syntax. Multiple conditions act as logical AND.</p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between rounded-b-xl">
             <button 
                onClick={() => onDelete(edge.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
             >
                <Trash2 size={16} /> Delete Connection
             </button>
             <div className="flex gap-2">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <Save size={16} /> Save Changes
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ConditionModal;
