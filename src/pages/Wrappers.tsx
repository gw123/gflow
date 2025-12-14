import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useUserStore, useWorkflowStore } from '../stores';
import ToolsManager from '../components/ToolsManager';
import ApiManager from '../components/ApiManager';
import { WorkflowListPage } from '../components/workflow-list/WorkflowListPage';
import { api } from '../api/client';
import { ArrowLeft, Database } from 'lucide-react';

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

export { SecretsPage } from './SecretsPage';
export { ToolsPage } from './ToolsPage';
export { ApiPage } from './ApiPage';

export const WorkflowsPage = () => {
    const navigate = useNavigate();
    const wfStore = useWorkflowStore();
    const ui = useUIStore();

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 flex flex-col">
             <div className="pt-16 h-full">
                <WorkflowListPage
                    onEditWorkflow={(workflow, id) => {
                        wfStore.loadWorkflow(workflow, id);
                        navigate('/editor');
                    }}
                    notify={ui.showToast}
                />
             </div>
            <BackButton />
        </div>
    )
}

export const StoragePage = () => {
    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 flex flex-col items-center justify-center text-slate-500">
            <BackButton />
            <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col items-center">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4 text-purple-600">
                    <Database size={48} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Storage Management</h2>
                <p>This feature is coming soon.</p>
            </div>
        </div>
    )
}
