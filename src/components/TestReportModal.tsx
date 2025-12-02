
import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Shield, Activity, Zap } from 'lucide-react';
import { TestReport } from '../../tester';

interface TestReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TestReport | null;
}

const TestReportModal: React.FC<TestReportModalProps> = ({ isOpen, onClose, report }) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'simulation'>('issues');

  if (!isOpen || !report) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="text-red-500" size={18} />;
      case 'warning': return <Info className="text-amber-500" size={18} />;
      default: return <CheckCircle className="text-blue-500" size={18} />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
             <div className={`p-2.5 rounded-full ${report.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {report.isValid ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Workflow Test Report</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {report.isValid 
                        ? "No critical issues found. Ready to run." 
                        : `${report.summary.criticalCount} critical issues found.`}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900">
            <div className="p-4 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Nodes</span>
                <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{report.summary.totalNodes}</span>
            </div>
            <div className="p-4 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Errors</span>
                <span className={`text-2xl font-bold ${report.summary.criticalCount > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                    {report.summary.criticalCount}
                </span>
            </div>
            <div className="p-4 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Warnings</span>
                <span className={`text-2xl font-bold ${report.summary.warningCount > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {report.summary.warningCount}
                </span>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 border-b border-slate-200 dark:border-slate-700 gap-6">
            <button 
                onClick={() => setActiveTab('issues')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'issues' 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                <Shield size={16}/> Issues List
            </button>
            <button 
                onClick={() => setActiveTab('simulation')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'simulation' 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                <Activity size={16}/> Simulation Trace
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950/50">
            
            {activeTab === 'issues' && (
                <div className="space-y-3">
                    {report.issues.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 mx-auto rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">All Clear!</h3>
                            <p className="text-slate-500 dark:text-slate-400">No configuration issues detected.</p>
                        </div>
                    ) : (
                        report.issues.map((issue) => (
                            <div key={issue.id} className={`flex items-start gap-4 p-4 rounded-lg border ${getSeverityBg(issue.severity)}`}>
                                <div className="mt-0.5 flex-shrink-0">{getSeverityIcon(issue.severity)}</div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
                                            {issue.category} Issue
                                        </h4>
                                        {issue.nodeName && (
                                            <span className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300">
                                                Node: {issue.nodeName}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {issue.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'simulation' && (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="space-y-6">
                        {report.simulation.map((step, idx) => (
                            <div key={idx} className="relative flex items-start gap-4 group">
                                <div className={`z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm ${
                                    step.status === 'unreachable' 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700' 
                                    : 'bg-white border-blue-100 text-blue-600 dark:bg-slate-800 dark:border-blue-900 dark:text-blue-400'
                                }`}>
                                    {step.order > 0 ? step.order : '-'}
                                </div>
                                <div className={`flex-1 p-3 rounded-lg border ${
                                    step.status === 'unreachable'
                                    ? 'bg-slate-100 border-slate-200 opacity-70 dark:bg-slate-800/50 dark:border-slate-700'
                                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            {step.nodeName}
                                            {step.status === 'unreachable' && <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-500 rounded-full uppercase">Unreachable</span>}
                                        </h4>
                                        <Zap size={14} className={step.status === 'reachable' ? 'text-blue-400' : 'text-slate-300'} />
                                    </div>
                                    {step.note && <p className="text-xs text-slate-500">{step.note}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    {report.simulation.length === 0 && (
                        <div className="text-center text-slate-400 py-8">
                            No reachable nodes found.
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
                Close Report
            </button>
        </div>

      </div>
    </div>
  );
};

export default TestReportModal;
