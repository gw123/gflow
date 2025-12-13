import React from 'react';
import { Search, Grid, List, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button'; // Assuming Button component exists in UI folder
import { Input } from '../ui/Input';   // Assuming Input component exists

interface WorkflowToolbarProps {
    filters: {
        searchQuery: string;
        status: string | undefined;
        sortBy: string;
        sortOrder: 'asc' | 'desc';
    };
    onFiltersChange: (filters: any) => void;
    viewMode: 'table' | 'grid';
    onViewModeChange: (mode: 'table' | 'grid') => void;
    onCreateNew: () => void;
    selectedCount?: number;
    onBatchDelete?: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
    filters,
    onFiltersChange,
    viewMode,
    onViewModeChange,
    onCreateNew,
    selectedCount = 0,
    onBatchDelete
}) => {
    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 w/full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        className="pl-9 w-full"
                        placeholder="Search workflows..."
                        value={filters.searchQuery}
                        onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                    />
                </div>

                <select
                    className="h-10 px-3 py-2 border rounded-md bg-transparent text-sm text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.status || ''}
                    onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
                >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
                <select
                    className="h-10 px-3 py-2 border rounded-md bg-transparent text-sm text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.sortBy}
                    onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value })}
                >
                    <option value="name">Sort: Name</option>
                    <option value="updatedAt">Sort: Updated</option>
                    <option value="createdAt">Sort: Created</option>
                </select>
                <select
                    className="h-10 px-3 py-2 border rounded-md bg-transparent text-sm text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.sortOrder}
                    onChange={(e) => onFiltersChange({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
                >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                        onClick={() => onViewModeChange('table')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        title="Grid View"
                    >
                        <Grid size={18} />
                    </button>
                </div>

                {selectedCount > 0 && onBatchDelete && (
                    <Button variant="danger" onClick={onBatchDelete} className="flex items-center gap-2">
                        <Trash2 size={18} />
                        Delete Selected ({selectedCount})
                    </Button>
                )}

                <Button onClick={onCreateNew} className="flex items-center gap-2">
                    <Plus size={18} />
                    <span className="hidden sm:inline">New Workflow</span>
                    <span className="sm:hidden">New</span>
                </Button>
            </div>
        </div>
    );
};
