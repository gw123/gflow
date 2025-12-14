import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useWorkflowStore } from '../stores';
import ToolsManager from '../components/ToolsManager';
import { ArrowLeft } from 'lucide-react';
import { ToolDefinition } from '../types';

const BackButton = () => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate('/')}
            className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700 transition-all"
        >
            <ArrowLeft size={16} />
            Back to Home
        </button>
    );
};

export const ToolsPage = () => {
  const navigate = useNavigate();
  const wfStore = useWorkflowStore();
  const ui = useUIStore();
  const [tools, setTools] = useState<ToolDefinition[]>([]);

  // Load tools from localStorage or workflow store
  useEffect(() => {
      // NOTE: Tools are currently part of the workflow definition in the store
      // If we want global tools, we should probably have a separate store or API for them.
      // For now, let's assume tools are managed within the current workflow context 
      // OR we are implementing a global tools manager.
      // Based on the user request, this seems to be a global manager.
      
      // Let's try to load from localStorage for persistence if it's a global feature
      const stored = localStorage.getItem('gflow_global_tools');
      if (stored) {
          try {
              setTools(JSON.parse(stored));
          } catch (e) {
              console.error("Failed to parse local tools", e);
          }
      } else if (wfStore.workflowData.tools) {
          // Fallback to workflow tools if no global tools found
          setTools(wfStore.workflowData.tools);
      }
  }, []);

  const handleSave = (updatedTools: ToolDefinition[]) => {
      setTools(updatedTools);
      localStorage.setItem('gflow_global_tools', JSON.stringify(updatedTools));
      
      // Also update the current workflow if needed, or maybe this page is just for global tools?
      // If the intention is to manage tools available to ALL workflows, we need a backend endpoint.
      // If it's just for the current workflow, we should sync with wfStore.
      
      // Sync with current workflow for now to maintain compatibility
      wfStore.updateWorkflowData({ tools: updatedTools });
      ui.showToast("Tools saved locally", "success");
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 overflow-hidden flex flex-col">
       <BackButton />
       <div className="flex-1 mt-16 p-4 overflow-auto">
          <ToolsManager 
              isOpen={true}
              onClose={() => navigate('/')}
              workflow={{ ...wfStore.workflowData, tools }} // Pass local tools
              onSave={handleSave}
          />
       </div>
    </div>
  );
};

export default ToolsPage;
