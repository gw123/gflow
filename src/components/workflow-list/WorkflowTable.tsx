import React from 'react';
import { WorkflowRecord } from '../../api/client';
import { Edit, Play, Trash2, FileText, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/Button'; // Reuse Button

interface WorkflowTableProps {
    workflows: WorkflowRecord[];
    onEdit: (workflow: WorkflowRecord) => void;
    onExecute: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onShowHistory: (id: string, e: React.MouseEvent) => void;
    selectedIds?: string[];
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: () => void;
}

const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">DRAFT</span>;

    const styles: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
        published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status.toLowerCase()] || styles.draft}`}>
            {status.toUpperCase()}
        </span>
    );
};

export const WorkflowTable: React.FC<WorkflowTableProps> = ({
    workflows = [],
    onEdit,
    onExecute,
    onDelete,
    onShowHistory,
    selectedIds = [],
    onToggleSelect,
    onToggleSelectAll
}) => {
    if (!workflows || workflows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>No workflows found.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={(selectedIds?.length || 0) > 0 && (selectedIds?.length || 0) === (workflows?.length || 0)}
                                    onChange={() => onToggleSelectAll && onToggleSelectAll()}
                                />
                            </th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4">Updated</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(workflows || []).map((wf) => (
                            <tr
                                key={wf.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                onClick={() => onEdit(wf)}
                            >
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={(selectedIds || []).includes(wf.id)}
                                        onChange={() => onToggleSelect && onToggleSelect(wf.id)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900 dark:text-slate-100">{wf.name}</div>
                                    {wf.description && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                                            {wf.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={wf.status} />
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {wf.created_at ? new Date(wf.created_at).toLocaleDateString() : '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} />
                                        {new Date(wf.updatedAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => onExecute(wf.id, e)}
                                            title="Execute Workflow"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                        >
                                            <Play size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => onShowHistory(wf.id, e)}
                                            title="View History"
                                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                        >
                                            <FileText size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onEdit(wf)}
                                            title="Edit Workflow"
                                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                        >
                                            <Edit size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => onDelete(wf.id, e)}
                                            title="Delete Workflow"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
