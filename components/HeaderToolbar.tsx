
import React from 'react';
import { 
  LayoutDashboard, Box, FolderOpen, Save, Upload, Laptop, Cloud, Play, 
  StepForward, Globe, Wrench, Key, Settings, Sparkles, UserCircle
} from 'lucide-react';
import { User } from '../api/client';
import { WorkflowExecutionState } from '../types';

interface HeaderToolbarProps {
  user: User | null;
  runMode: 'local' | 'cloud';
  setRunMode: (mode: 'local' | 'cloud') => void;
  executionState: WorkflowExecutionState;
  
  // Actions
  onLayout: () => void;
  onOpenWorkflowList: () => void;
  onSaveWorkflow: () => void;
  onRunWorkflow: (mode: 'run' | 'step') => void;
  
  // Modal Toggles
  onOpenApiManager: () => void;
  onOpenToolsManager: () => void;
  onOpenSecretsManager: () => void;
  onOpenConfig: () => void;
  onOpenCopilot: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  user,
  runMode,
  setRunMode,
  executionState,
  onLayout,
  onOpenWorkflowList,
  onSaveWorkflow,
  onRunWorkflow,
  onOpenApiManager,
  onOpenToolsManager,
  onOpenSecretsManager,
  onOpenConfig,
  onOpenCopilot,
  onOpenAuth,
  onOpenProfile
}) => {
  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-20 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-lg tracking-tight">
           <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LayoutDashboard size={20} />
           </div>
           G-Flow
        </div>
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
        
        <div className="flex items-center gap-1">
           <button 
              onClick={onLayout}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Auto Layout"
           >
              <Box size={18} />
           </button>
           <button 
              onClick={onOpenWorkflowList}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Open Workflow"
           >
              <FolderOpen size={18} />
           </button>
           <button 
              onClick={onSaveWorkflow}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title={user ? "Save to Cloud" : "Login to Save"}
           >
              {user ? <Save size={18} /> : <Upload size={18} />}
           </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
         {/* Run Mode Switch */}
         <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700 mr-2">
             <button 
                onClick={() => setRunMode('local')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${runMode === 'local' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
             >
                 <Laptop size={12} /> Local
             </button>
             <button 
                onClick={() => setRunMode('cloud')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${runMode === 'cloud' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
             >
                 <Cloud size={12} /> Cloud
             </button>
         </div>

         <button 
            onClick={() => onRunWorkflow('run')}
            disabled={executionState.isRunning && !executionState.isPaused && !executionState.waitingForInput}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${
                executionState.isRunning && !executionState.waitingForInput
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
         >
            <Play size={14} className={executionState.isRunning ? "animate-pulse" : "fill-current"} /> 
            {executionState.isRunning ? 'Running...' : `Run (${runMode})`}
         </button>

         <button 
            onClick={() => onRunWorkflow('step')}
            disabled={executionState.isRunning || runMode === 'cloud'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm border ${
                (executionState.isRunning || runMode === 'cloud')
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800' 
                : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-slate-700'
            }`}
            title="Step Run (Debug Local)"
         >
            <StepForward size={14} /> 
         </button>

         <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

         <button 
              onClick={onOpenApiManager}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="API Manager"
         >
              <Globe size={14} /> APIs
         </button>

         <button 
              onClick={onOpenToolsManager}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="Manage Agent Tools"
         >
              <Wrench size={14} /> Tools
         </button>

         <button 
              onClick={onOpenSecretsManager}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
         >
              <Key size={14} /> Secrets
         </button>

         <button 
              onClick={onOpenConfig}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Global Config"
         >
              <Settings size={18} />
         </button>

         <button 
              onClick={onOpenCopilot}
              className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-md transition-all text-xs font-bold"
         >
              <Sparkles size={14} /> Copilot
         </button>

         {user ? (
             <button onClick={onOpenProfile} className="ml-2">
                 <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                     {user.username.substring(0, 2).toUpperCase()}
                 </div>
             </button>
         ) : (
             <button 
                onClick={onOpenAuth}
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
