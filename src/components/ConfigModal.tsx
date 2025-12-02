
import React, { useState, useEffect } from 'react';
import { X, Save, Check, AlertCircle } from 'lucide-react';
import { WorkflowDefinition } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowDefinition;
  onSave: (updatedParts: Partial<WorkflowDefinition>) => void;
  initialTab?: 'global' | 'storages' | 'codes' | 'pinData';
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, workflow, onSave, initialTab = 'global' }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'storages' | 'codes' | 'pinData'>(initialTab);
  const [jsonValue, setJsonValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadJson(initialTab);
      setStatus('idle');
      setMessage('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab]);

  const loadJson = (tab: string) => {
    setStatus('idle');
    setMessage('');
    let data;
    switch (tab) {
      case 'global':
        data = workflow.global || {};
        break;
      case 'storages':
        data = workflow.storages || [];
        break;
      case 'codes':
        data = workflow.codes || [];
        break;
      case 'pinData':
        data = workflow.pinData || {};
        break;
      default:
        data = {};
    }
    setJsonValue(JSON.stringify(data, null, 2));
  };

  const handleTabChange = (tab: 'global' | 'storages' | 'codes' | 'pinData') => {
    setActiveTab(tab);
    loadJson(tab);
  };

  const handleSave = () => {
    setStatus('idle');
    setMessage('');

    try {
      const parsed = JSON.parse(jsonValue);
      onSave({ [activeTab]: parsed });
      
      setStatus('success');
      setMessage('Configuration saved successfully!');
      
      // Close modal after a brief success indication
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e) {
      setStatus('error');
      setMessage("Invalid JSON format. Please check your syntax.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[80vh] max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Workflow Configuration</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {(['global', 'storages', 'codes', 'pinData'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700/50'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                Edit the JSON configuration for <strong>{activeTab}</strong> below:
            </p>
            <textarea
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                className={`flex-1 w-full p-4 font-mono text-sm border rounded-lg bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:ring-2 outline-none resize-none ${
                   status === 'error' 
                     ? 'border-red-300 focus:ring-red-500' 
                     : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                spellCheck={false}
            />
            
            {/* Status Message */}
            {(status !== 'idle' && message) && (
                <div className={`mt-3 p-3 text-sm rounded flex-shrink-0 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 ${
                    status === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {status === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span>{message}</span>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'success'}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-all duration-200 ${
                status === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {status === 'success' ? <Check size={18} /> : <Save size={18} />}
            {status === 'success' ? 'Saved' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
