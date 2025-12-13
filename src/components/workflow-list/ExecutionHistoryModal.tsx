import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { api, ExecutionHistoryItem } from '../../api/client';

interface ExecutionHistoryModalProps {
    workflowId: string | null;
    onClose: () => void;
}

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'success': return <CheckCircle size={18} className="text-green-500" />;
        case 'error': return <XCircle size={18} className="text-red-500" />;
        case 'running': return <Loader2 size={18} className="text-blue-500 animate-spin" />;
        default: return <Clock size={18} className="text-slate-400" />;
    }
};

export const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({ workflowId, onClose }) => {
    const [executions, setExecutions] = useState<ExecutionHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (workflowId) {
            loadHistory();
        }
    }, [workflowId]);

    const loadHistory = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            // Load recent 20 executions
            const res = await api.getWorkflowExecutions(workflowId, { limit: 20 });
            setExecutions(res.data);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    if (!workflowId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" /> Execution History
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/50">
                    {loading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 size={32} className="animate-spin text-slate-400" />
                        </div>
                    ) : executions.length === 0 ? (
                        <div className="text-center p-10 text-slate-400">
                            No execution history found.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {executions.map(exec => (
                                <div key={exec.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <div
                                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">
                                                {expandedId === exec.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                            <StatusIcon status={exec.status} />
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {new Date(exec.created_at).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
                                                    <span>Duration: {exec.duration_ms ? `${exec.duration_ms}ms` : '-'}</span>
                                                    <span>Type: {exec.trigger_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {exec.status === 'error' && (
                                            <span className="text-xs text-red-500 max-w-[200px] truncate hidden sm:block">
                                                {exec.error_message}
                                            </span>
                                        )}
                                    </div>

                                    {expandedId === exec.id && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-200 text-xs p-3 font-mono overflow-auto max-h-[300px]">
                                            {exec.logs && exec.logs.length > 0 ? (
                                                exec.logs.map((log, i) => (
                                                    <div key={i} className="whitespace-pre-wrap py-0.5 border-b border-slate-800/50 last:border-0">
                                                        {log}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-slate-500 italic">No logs available</div>
                                            )}

                                            {exec.output_data && (
                                                <div className="mt-3 pt-3 border-t border-slate-700">
                                                    <div className="text-blue-400 font-bold mb-1">Output Data:</div>
                                                    <pre>{JSON.stringify(exec.output_data, null, 2)}</pre>
                                                </div>
                                            )}

                                            {exec.error_message && (
                                                <div className="mt-3 pt-3 border-t border-slate-700">
                                                    <div className="text-red-400 font-bold mb-1">Error:</div>
                                                    <pre className="text-red-300">{exec.error_message}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
