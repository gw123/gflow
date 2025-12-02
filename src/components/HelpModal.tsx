
import React, { useState } from 'react';
import { X, BookOpen, Zap, Settings, Key, Play, GitBranch, Braces, Database, Code, Layers } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('basics');

  if (!isOpen) return null;

  const renderContent = () => {
    switch(activeTab) {
      case 'basics':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Getting Started</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Welcome to the Visual Workflow Editor. This tool allows you to build complex automation workflows by connecting different functional nodes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2 font-semibold text-blue-700 dark:text-blue-300">
                  <Zap size={18} /> 1. Add Nodes
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Drag components from the <strong>Sidebar</strong> on the left and drop them onto the canvas. Nodes represent specific actions like HTTP requests, AI prompts, or scripts.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2 font-semibold text-purple-700 dark:text-purple-300">
                  <GitBranch size={18} /> 2. Connect
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Drag from the right <strong>handle</strong> of one node to the left handle of another to create a connection. This defines the flow of execution.
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2 font-semibold text-amber-700 dark:text-amber-300">
                  <Settings size={18} /> 3. Configure
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Click on any node to open the <strong>Editor Panel</strong> on the right. Here you can set parameters, bind inputs, and configure logic.
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2 font-semibold text-green-700 dark:text-green-300">
                  <Play size={18} /> 4. Run
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Click the <strong>Run Workflow</strong> button in the header to execute the flow directly in the browser. Watch real-time status updates and logs.
                </p>
              </div>
            </div>
          </div>
        );
      case 'params':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Parameters & Variables</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Nodes pass data to each other. You can use dynamic variables in your node parameters using the syntax <code>{'{{ variable }}'}</code>.
            </p>

            <div className="space-y-3 mt-4">
              <div className="border-l-4 border-blue-500 pl-4 py-1">
                <div className="flex items-center gap-2">
                    <code className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">$P.variableName</code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Access inputs passed from <strong>all previous nodes</strong>. The inputs are flattened for convenience.</p>
              </div>
              
              <div className="border-l-4 border-indigo-500 pl-4 py-1">
                <div className="flex items-center gap-2">
                    <code className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">$global.variableName</code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Access global variables defined in the <strong>Global Config</strong> menu.</p>
              </div>

              <div className="border-l-4 border-pink-500 pl-4 py-1">
                <div className="flex items-center gap-2">
                    <code className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400">$NodeName.outputField</code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Directly reference the output of a specific upstream node by its name.</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Code size={12}/> Example Usage</div>
              <div className="space-y-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                <div className="flex gap-2">
                    <span className="text-slate-400 w-20 text-right">Prompt:</span>
                    <span className="text-green-600 dark:text-green-400">"Summarize this: {'{{ $P.articleText }}'}"</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-slate-400 w-20 text-right">SQL:</span>
                    <span className="text-green-600 dark:text-green-400">"SELECT * FROM users WHERE id = {'{{ $global.currentUserId }}'}"</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-slate-400 w-20 text-right">URL:</span>
                    <span className="text-green-600 dark:text-green-400">"https://api.example.com/data?id={'{{ $Webhook.query.id }}'}"</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'secrets':
         return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Secrets & Credentials</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Securely manage API keys, database passwords, and other sensitive data without hardcoding them into node parameters.
            </p>

            <div className="grid grid-cols-1 gap-4 mt-2">
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Open Secrets Manager</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Click the <Key size={10} className="inline"/> <strong>Secrets</strong> button in the header toolbar.</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Create Credential</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Add a new secret (e.g., "My OpenAI Key"). Choose the appropriate type (e.g., Database, Auth, API).</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Link to Node</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">In the Node Editor, locate the <strong>Authentication</strong> section. Switch to <strong>Managed</strong> mode and select your created secret.</p>
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded mt-4">
                <Key size={16} className="flex-shrink-0" />
                <span>Secrets are stored in the YAML structure. Be careful when sharing your exported YAML file if it contains sensitive values.</span>
            </div>
          </div>
         );
      case 'modules':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white">Additional Modules</h3>
             <div className="grid grid-cols-1 gap-3">
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                        <Database size={14} className="text-blue-500"/> Storages
                    </div>
                    <p className="text-xs text-slate-500">Define S3 buckets or FTP servers to be used by storage nodes for file uploads/downloads.</p>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                        <Braces size={14} className="text-purple-500"/> Codes
                    </div>
                    <p className="text-xs text-slate-500">Manage shared code snippets or libraries that can be referenced in JS nodes.</p>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                        <Layers size={14} className="text-orange-500"/> Global Config
                    </div>
                    <p className="text-xs text-slate-500">Set global constant values available to all nodes via <code>$global</code>.</p>
                </div>
             </div>
          </div>
        );
       default:
         return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col h-[75vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
           <div className="flex items-center gap-2.5">
             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <BookOpen size={20} />
             </div>
             <div>
                 <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-none">User Guide</h2>
                 <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium uppercase tracking-wider">Documentation & Help</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all">
             <X size={20} />
           </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar Navigation */}
           <div className="w-56 bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700 p-3 space-y-1 flex-shrink-0">
              <button 
                onClick={() => setActiveTab('basics')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'basics' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Zap size={16} className={activeTab === 'basics' ? 'fill-blue-100 dark:fill-blue-900' : ''}/> Basics
              </button>
              <button 
                onClick={() => setActiveTab('params')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'params' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Braces size={16} className={activeTab === 'params' ? 'fill-blue-100 dark:fill-blue-900' : ''}/> Parameters
              </button>
              <button 
                onClick={() => setActiveTab('secrets')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'secrets' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Key size={16} className={activeTab === 'secrets' ? 'fill-blue-100 dark:fill-blue-900' : ''}/> Secrets
              </button>
              <button 
                onClick={() => setActiveTab('modules')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'modules' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Settings size={16} className={activeTab === 'modules' ? 'fill-blue-100 dark:fill-blue-900' : ''}/> Modules
              </button>
           </div>

           {/* Content Area */}
           <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {renderContent()}
           </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center text-[10px] text-slate-400">
            Visual Workflow Editor v6.0 • Documentation
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
