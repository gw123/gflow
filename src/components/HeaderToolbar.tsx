
import React from 'react';
import {
   LayoutDashboard, Box, FolderOpen, Save, Upload, Laptop, Cloud, Play,
   StepForward, Globe, Wrench, Key, Settings, Sparkles, UserCircle, ArrowLeft
} from 'lucide-react';
import { useUserStore, useUIStore, useWorkflowStore, useExecutionStore } from '../stores';
import { api } from '../api/client';
import { flowToWorkflow } from '../utils';

interface HeaderToolbarProps {
   onRunWorkflow: (mode: 'run' | 'step') => void;
   currentView: 'editor' | 'workflow_list';
   onViewChange: (view: 'editor' | 'workflow_list') => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
   onRunWorkflow,
   currentView,
   onViewChange
}) => {
   const ui = useUIStore();
   const userStore = useUserStore();
   const wfStore = useWorkflowStore();
   const execStore = useExecutionStore();

   const handleSaveWorkflow = async () => {
      if (!userStore.user) {
         ui.showToast("Please login to save workflows to server", "info");
         ui.setModalOpen('authModalOpen', true);
         return;
      }

      const currentData = flowToWorkflow(wfStore.workflowData, wfStore.nodes, wfStore.edges);
      try {
         if (wfStore.currentWorkflowId) {
            await api.updateWorkflow(wfStore.currentWorkflowId, currentData.name, currentData);
            ui.showToast("Workflow saved to server", "success");
         } else {
            const created = await api.createWorkflow(currentData.name, currentData);
            wfStore.setCurrentWorkflowId(created.id);
            ui.showToast("New workflow created on server", "success");
         }
      } catch (e: any) {
         ui.showToast(e.message, "error");
      }
   };

   return (
      <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-20 flex-shrink-0">
         <div className="flex items-center gap-4">
            {currentView === 'workflow_list' ? (
               <button
                  onClick={() => onViewChange('editor')}
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
               >
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                     <ArrowLeft size={18} />
                  </div>
                  <span className="hidden sm:inline">Back to Editor</span>
               </button>
            ) : (
               <div
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-lg tracking-tight cursor-pointer"
                  onClick={() => onViewChange('workflow_list')}
                  title="Go to Dashboard"
               >
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                     <LayoutDashboard size={20} />
                  </div>
                  G-Flow
               </div>
            )}

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

            <div className="flex items-center gap-1">
               {currentView === 'editor' && (
                  <button
                     onClick={() => wfStore.layout()}
                     className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                     title="Auto Layout"
                  >
                     <Box size={18} />
                  </button>
               )}
               <button
                  onClick={() => onViewChange(currentView === 'workflow_list' ? 'editor' : 'workflow_list')}
                  className={`p-2 rounded-md transition-colors ${currentView === 'workflow_list'
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                     }`}
                  title="Workflow Manager"
               >
                  <FolderOpen size={18} />
               </button>

               {currentView === 'editor' && (
                  <button
                     onClick={handleSaveWorkflow}
                     className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                     title={userStore.user ? "Save to Cloud" : "Login to Save"}
                  >
                     {userStore.user ? <Save size={18} /> : <Upload size={18} />}
                  </button>
               )}
            </div>
         </div>

         <div className="flex items-center gap-3">
            {/* Run Mode Switch - Only in Editor */}
            {currentView === 'editor' && (
               <>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700 mr-2 hidden sm:flex">
                     <button
                        onClick={() => execStore.setRunMode('local')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${execStore.runMode === 'local' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                     >
                        <Laptop size={12} /> Local
                     </button>
                     <button
                        onClick={() => execStore.setRunMode('cloud')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${execStore.runMode === 'cloud' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                     >
                        <Cloud size={12} /> Cloud
                     </button>
                  </div>

                  <button
                     onClick={() => onRunWorkflow('run')}
                     disabled={execStore.executionState.isRunning && !execStore.executionState.isPaused && !execStore.executionState.waitingForInput}
                     className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${execStore.executionState.isRunning && !execStore.executionState.waitingForInput
                           ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                           : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                        }`}
                  >
                     <Play size={14} className={execStore.executionState.isRunning ? "animate-pulse" : "fill-current"} />
                     {execStore.executionState.isRunning ? 'Running...' : 'Run'}
                  </button>

                  <button
                     onClick={() => onRunWorkflow('step')}
                     disabled={execStore.executionState.isRunning || execStore.runMode === 'cloud'}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm border ${(execStore.executionState.isRunning || execStore.runMode === 'cloud')
                           ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800'
                           : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-slate-700'
                        }`}
                     title="Step Run (Debug Local)"
                  >
                     <StepForward size={14} />
                  </button>

                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
               </>
            )}

            <button
               onClick={() => onViewChange('workflow_list')}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors hidden md:flex"
               title="Workflow Manager"
            >
               <FolderOpen size={14} /> Workflows
            </button>

            <button
               onClick={() => ui.setModalOpen('apiManagerOpen', true)}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors hidden md:flex"
               title="API Manager"
            >
               <Globe size={14} /> APIs
            </button>

            <button
               onClick={() => ui.setModalOpen('toolsManagerOpen', true)}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors hidden md:flex"
               title="Manage Agent Tools"
            >
               <Wrench size={14} /> Tools
            </button>

            <button
               onClick={() => ui.setModalOpen('secretsManagerOpen', true)}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors hidden md:flex"
            >
               <Key size={14} /> Secrets
            </button>

            <button
               onClick={() => ui.setModalOpen('configModalOpen', true)}
               className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
               title="Global Config"
            >
               <Settings size={18} />
            </button>

            <button
               onClick={() => ui.setModalOpen('copilotOpen', true)}
               className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-md transition-all text-xs font-bold"
            >
               <Sparkles size={14} /> Copilot
            </button>

            {userStore.user ? (
               <button onClick={() => ui.setModalOpen('userProfileOpen', true)} className="ml-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                     {userStore.user.username.substring(0, 2).toUpperCase()}
                  </div>
               </button>
            ) : (
               <button
                  onClick={() => ui.setModalOpen('authModalOpen', true)}
                  className="ml-2 p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  title="Login"
               >
                  <UserCircle size={22} />
               </button>
            )}
         </div>
      </header>
   );
};
