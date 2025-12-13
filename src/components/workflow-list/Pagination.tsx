import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number; // 0-indexed
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
    page,
    pageSize,
    total,
    onPageChange,
}) => {
    const totalPages = Math.ceil(total / pageSize);
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, total);

    if (total === 0) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{' '}
                        <span className="font-medium">{total}</span> results
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft size={16} />
                        </button>
                        {/* Simple pagination logic: just show current page context or similar if needed. 
                For now we keep it simple: Prev / Page X of Y / Next */}
                        <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight size={16} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};
