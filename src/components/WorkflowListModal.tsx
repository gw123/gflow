
import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Trash2, Calendar, FolderOpen, Loader2 } from 'lucide-react';
import { api, WorkflowSummary } from '../../api/client';
import { WorkflowDefinition } from '../../types';
import { SAMPLE_YAML } from '../../constants';
import yaml from 'js-yaml';

interface WorkflowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWorkflow: (workflow: WorkflowDefinition, id: string) => void;
  currentWorkflowId: string | null;
  notify: (msg: string, type: any) => void;
}

const WorkflowListModal: React.FC<WorkflowListModalProps> = ({ isOpen, onClose, onLoadWorkflow, currentWorkflowId, notify }) => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadWorkflows();
    }
  }, [isOpen]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const list = await api.getWorkflows();
      setWorkflows(list);
    } catch (e) {
      notify("Failed to load workflows. Is the server running?", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newWorkflowName.trim()) return;
    try {
      const defaultContent: WorkflowDefinition = yaml.load(SAMPLE_YAML) as WorkflowDefinition;
      defaultContent.name = newWorkflowName;
      
      const created = await api.createWorkflow(newWorkflowName, defaultContent);
      setWorkflows([...workflows, { id: created.id, name: created.name, updatedAt: created.updatedAt }]);
      setNewWorkflowName('');
      setCreating(false);
      notify("Workflow created", "success");
    } catch (e) {
      notify("Failed to create workflow", "error");
    }
  };

  const handleSelect = async (id: string) => {
    try {
      setLoading(true);
      const full = await api.getWorkflow(id);
      onLoadWorkflow(full.content, id);
      onClose();
    } catch (e) {
      notify("Failed to load workflow details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await api.deleteWorkflow(id);
      setWorkflows(workflows.filter(w => w.id !== id));
      notify("Workflow deleted", "success");
    } catch (e) {
      notify("Failed to delete workflow", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col h-[70vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-500" /> Workflow Manager
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/50">
          {loading && workflows.length === 0 ? (
             <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-2" />
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {workflows.map(wf => (
                <div 
                  key={wf.id}
                  onClick={() => handleSelect(wf.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md flex items-center justify-between group ${
                    currentWorkflowId === wf.id 
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${currentWorkflowId === wf.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                        <FileText size={20} />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{wf.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                           <Calendar size={12} /> {new Date(wf.updatedAt).toLocaleString()}
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(wf.id, e)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {workflows.length === 0 && !loading && (
                  <div className="text-center py-10 text-slate-400">
                      No workflows found on server. Create one to get started.
                  </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center rounded-b-xl">
            {creating ? (
                <div className="flex-1 flex gap-2 animate-in slide-in-from-left-2">
                    <input 
                       autoFocus
                       type="text" 
                       placeholder="Workflow Name"
                       value={newWorkflowName}
                       onChange={e => setNewWorkflowName(e.target.value)}
                       className="flex-1 px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                       onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Create</button>
                    <button onClick={() => setCreating(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-md">Cancel</button>
                </div>
            ) : (
                <button 
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  <Plus size={18} /> New Workflow
                </button>
            )}
            <div className="text-xs text-slate-400">
                {workflows.length} Workflows
            </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowListModal;
