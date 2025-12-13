import React, { useState, useEffect, useCallback } from 'react';
import { api, WorkflowRecord } from '../../api/client';
import { WorkflowDefinition } from '../../types';
import { SAMPLE_YAML } from '../../constants';
import yaml from 'js-yaml';
// Components
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowTable } from './WorkflowTable';
import { WorkflowCard } from './WorkflowCard';
import { Pagination } from './Pagination';
import { ExecutionHistoryModal } from './ExecutionHistoryModal';

interface WorkflowListPageProps {
    onEditWorkflow: (workflow: WorkflowDefinition, id: string) => void;
    notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const WorkflowListPage: React.FC<WorkflowListPageProps> = ({
    onEditWorkflow,
    notify
}) => {
    const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [historyId, setHistoryId] = useState<string | null>(null); // For Modal
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filters & Sorting
    const [filters, setFilters] = useState({
        searchQuery: '',
        status: undefined as string | undefined,
        sortBy: 'updatedAt' as string,
        sortOrder: 'desc' as 'asc' | 'desc'
    });

    // Pagination
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 12, // slightly larger for grid view
        total: 0
    });

    // Load Workflows
    const loadWorkflows = useCallback(async () => {
        setLoading(true);
        try {
            const result = await api.getWorkflowsPaginated({
                limit: pagination.pageSize,
                offset: pagination.page * pagination.pageSize,
                search: filters.searchQuery,
                status: filters.status,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            });
            setWorkflows(result.data);
            setPagination(prev => ({ ...prev, total: result.total }));
        } catch (error: any) {
            console.error('Failed to load workflows:', error);
            notify('Failed to load workflows', 'error');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page, pagination.pageSize, notify]); // Added notify to deps or just ignore

    // Effect to load on mount and when deps change
    useEffect(() => {
        const timer = setTimeout(() => {
            loadWorkflows();
        }, 300); // Simple debounce for effect trigger if filters change fast
        return () => clearTimeout(timer);
    }, [loadWorkflows]);

    // Handlers
    const handleCreateNew = async () => {
        const name = prompt("Enter workflow name:");
        if (!name) return;

        try {
            const defaultContent = yaml.load(SAMPLE_YAML) as WorkflowDefinition;
            defaultContent.name = name;
            const created = await api.createWorkflow(name, defaultContent);
            notify("Workflow created", "success");
            // Switch to edit mode immediately
            onEditWorkflow(defaultContent, created.id);
        } catch (e: any) {
            notify("Failed to create workflow: " + e.message, "error");
        }
    };

    const handleEdit = (wf: WorkflowRecord) => {
        onEditWorkflow(wf.content, wf.id);
    };

    const handleExecute = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Execute this workflow now?")) return;

        try {
            notify("Starting execution...", "info");
            await api.executeWorkflowById(id);
            notify("Workflow executed successfully", "success");
            // Optionally auto-open history
            // setHistoryId(id); 
        } catch (e: any) {
            notify("Execution failed: " + e.message, "error");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this workflow?")) return;

        try {
            await api.deleteWorkflow(id);
            notify("Workflow deleted", "success");
            loadWorkflows(); // Refresh list
        } catch (e: any) {
            notify("Failed to delete: " + e.message, "error");
        }
    };

    const handleShowHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setHistoryId(id);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-300">

            <WorkflowToolbar
                filters={filters}
                onFiltersChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onCreateNew={handleCreateNew}
                selectedCount={selectedIds.length}
                onBatchDelete={async () => {
                    if (selectedIds.length === 0) return;
                    if (!confirm(`Delete ${selectedIds.length} workflows?`)) return;
                    try {
                        await Promise.all(selectedIds.map(id => api.deleteWorkflow(id)));
                        setSelectedIds([]);
                        notify("Deleted selected workflows", "success");
                        loadWorkflows();
                    } catch (e: any) {
                        notify("Batch delete failed: " + e.message, "error");
                    }
                }}
            />

            <div className="flex-1 overflow-auto p-4 sm:p-6 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
                        {/* Loading spinner overlay */}
                    </div>
                )}

                {viewMode === 'table' ? (
                    <WorkflowTable
                        workflows={workflows}
                        onEdit={handleEdit}
                        onExecute={handleExecute}
                        onDelete={handleDelete}
                        onShowHistory={handleShowHistory}
                        selectedIds={selectedIds}
                        onToggleSelect={(id) => {
                            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                        }}
                        onToggleSelectAll={() => {
                            if (selectedIds.length === workflows.length) {
                                setSelectedIds([]);
                            } else {
                                setSelectedIds(workflows.map(w => w.id));
                            }
                        }}
                    />
                ) : (
                    <WorkflowCard
                        workflows={workflows}
                        onEdit={handleEdit}
                        onExecute={handleExecute}
                        onDelete={handleDelete}
                        onShowHistory={handleShowHistory}
                    />
                )}
            </div>

            <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={(p) => setPagination({ ...pagination, page: p })}
            />

            {historyId && (
                <ExecutionHistoryModal
                    workflowId={historyId}
                    onClose={() => setHistoryId(null)}
                />
            )}
        </div>
    );
};
