import React from 'react';
import { WorkflowRecord } from '../../api/client';
import { Edit, Play, Trash2, FileText, Calendar, Clock, MoreVertical } from 'lucide-react';

interface WorkflowCardProps {
    workflows: WorkflowRecord[];
    onEdit: (workflow: WorkflowRecord) => void;
    onExecute: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onShowHistory: (id: string, e: React.MouseEvent) => void;
}

const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">DRAFT</span>;

    const styles: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
        published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${styles[status.toLowerCase()] || styles.draft}`}>
            {status.toUpperCase()}
        </span>
    );
};

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
    workflows,
    onEdit,
    onExecute,
    onDelete,
    onShowHistory
}) => {
    if (workflows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>No workflows found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workflows.map(wf => (
                <div
                    key={wf.id}
                    className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer overflow-hidden"
                    onClick={() => onEdit(wf)}
                >
                    {/* Header */}
                    <div className="p-4 flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <StatusBadge status={wf.status} />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Could add a dropdown menu here for more actions */}
                            </div>
                        </div>

                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate" title={wf.name}>
                            {wf.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8">
                            {wf.description || 'No description provided.'}
                        </p>
                    </div>

                    {/* Footer Info */}
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                        </div>
                        {wf.created_by && <span>By User</span>}
                    </div>

                    {/* Action Overlay (visible on hover) */}
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => onExecute(wf.id, e)}
                            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                            title="Run"
                        >
                            <Play size={20} />
                        </button>
                        <button
                            onClick={(e) => onShowHistory(wf.id, e)}
                            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white transition-colors shadow-sm"
                            title="History"
                        >
                            <FileText size={20} />
                        </button>
                        <button
                            onClick={() => onEdit(wf)}
                            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white transition-colors shadow-sm"
                            title="Edit"
                        >
                            <Edit size={20} />
                        </button>
                        <button
                            onClick={(e) => onDelete(wf.id, e)}
                            className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                            title="Delete"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
