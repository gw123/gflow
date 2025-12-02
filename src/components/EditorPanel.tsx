
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Code, List, AlertCircle, Link, Info, Copy, ChevronRight, ChevronDown, Play, Database, FileText, Settings, ExternalLink } from 'lucide-react';
import { NodeDefinition, PluginParameterDefinition, InputFieldDefinition } from '../types';
import { FormBuilder } from './FormBuilder';
import { useUIStore, useWorkflowStore, useExecutionStore, useUserStore } from '../stores';
import { Registry } from '../registry';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { AutoForm } from './AutoForm';
import { JsonEditor, BodyEditor, KeyValueMapEditor, ValueInput } from './ui/Editors';
import { IconMap } from './icons';

// --- Variable Explorer Component ---

interface VariableTreeProps {
    data: any;
    path: string;
    onCopy: (path: string) => void;
    level?: number;
}

const VariableTree: React.FC<VariableTreeProps> = ({ data, path, onCopy, level = 0 }) => {
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

    const toggle = (key: string) => {
        setExpandedKeys(prev => ({...prev, [key]: !prev[key]}));
    };

    if (data === null || data === undefined) return <span className="text-slate-400 italic text-[10px]">null</span>;
    if (typeof data !== 'object') {
        return (
            <span 
                className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline text-[10px] break-all font-mono"
                onClick={() => onCopy(path)}
                title="Click to copy variable path"
            >
                {String(data)}
            </span>
        );
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-slate-400 text-[10px]">{}</span>;

    return (
        <div className="flex flex-col gap-0.5">
            {keys.map(key => {
                const val = data[key];
                const isObj = typeof val === 'object' && val !== null;
                const currentPath = path ? (key.includes(' ') || key.includes('-') ? `${path}["${key}"]` : `${path}.${key}`) : key;
                const isExpanded = expandedKeys[key];

                return (
                    <div key={key} className="pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
                        <div className="flex items-start gap-1">
                            {isObj ? (
                                <button 
                                    onClick={() => toggle(key)} 
                                    className="mt-0.5 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                                >
                                    {isExpanded ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                </button>
                            ) : (
                                <div className="w-3 h-3 flex-shrink-0" />
                            )}
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 group">
                                    <span 
                                        className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-blue-500"
                                        onClick={() => onCopy(currentPath)}
                                        title="Copy path"
                                    >
                                        {key}:
                                    </span>
                                    {!isObj && <VariableTree data={val} path={currentPath} onCopy={onCopy} level={level + 1} />}
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-500 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); onCopy(currentPath); }}
                                    >
                                        <Copy size={10} />
                                    </button>
                                </div>
                                {isObj && isExpanded && (
                                    <VariableTree data={val} path={currentPath} onCopy={onCopy} level={level + 1} />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const VariableExplorer: React.FC<{ 
    selectedNodeName: string;
}> = ({ selectedNodeName }) => {
    const { executionState } = useExecutionStore();
    const { workflowData } = useWorkflowStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        const interpolation = `{{ ${text} }}`;
        navigator.clipboard.writeText(interpolation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const upstreamNodes = useMemo(() => {
        return Object.keys(executionState.nodeResults).filter(n => n !== selectedNodeName);
    }, [executionState, selectedNodeName]);

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
             {copied && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
                    <Copy size={10} /> Copied!
                </div>
             )}
             
             <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                 Click variables to copy interpolation syntax <code>{'{{ ... }}'}</code>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 {/* Global Variables */}
                 <div>
                     <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                         <Database size={12} className="text-purple-500"/> Global Variables
                     </div>
                     <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2">
                         {Object.keys(workflowData.global || {}).length > 0 ? (
                             <VariableTree data={workflowData.global} path="$global" onCopy={handleCopy} />
                         ) : (
                             <span className="text-slate-400 text-[10px] italic">No global variables defined.</span>
                         )}
                     </div>
                 </div>

                 {/* Available Node Data */}
                 <div>
                     <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                         <FileText size={12} className="text-blue-500"/> Node Outputs
                     </div>
                     <div className="space-y-2">
                         {upstreamNodes.length === 0 ? (
                             <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded text-center text-slate-400 text-[10px]">
                                 Run the workflow to see data from other nodes here.
                             </div>
                         ) : (
                             upstreamNodes.map(nodeName => {
                                 const result = executionState.nodeResults[nodeName];
                                 if (!result || !result.output) return null;
                                 
                                 return (
                                     <div key={nodeName} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                                         <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                                             {nodeName}
                                         </div>
                                         <div className="p-2">
                                            <VariableTree 
                                                data={result.output} 
                                                path={`$node["${nodeName}"].output`}
                                                onCopy={handleCopy} 
                                            />
                                         </div>
                                     </div>
                                 );
                             })
                         )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Section Editor Helpers ---

const KeyValueList: React.FC<{ data: any; onChange: (key: string, val: any) => void; disabled?: boolean }> = ({ data, onChange, disabled }) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-6 text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <Info size={16} className="mb-1 opacity-50"/>
            <span className="text-xs italic">No parameters configured</span>
        </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="group relative pl-0">
           <div className={`flex flex-col md:flex-row md:items-start gap-1.5 md:gap-4 ${key === 'body' ? 'flex-col md:flex-col' : ''}`}>
              <div className={`${key === 'body' ? 'w-full' : 'w-full md:w-1/3'} pt-1.5 flex items-center`}>
                 <label 
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono break-all" 
                    title={key}
                 >
                     {key}
                 </label>
              </div>
              <div className={`${key === 'body' ? 'w-full' : 'w-full md:w-2/3'}`}>
                 {key === 'headers' && typeof value === 'object' ? (
                     <KeyValueMapEditor value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 ) : key === 'body' ? (
                     <BodyEditor value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 ) : (
                     <ValueInput value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 )}
              </div>
           </div>
           <div className="absolute -bottom-2 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800/50 hidden md:block group-last:hidden"></div>
        </div>
      ))}
    </div>
  );
};

const SectionEditor: React.FC<{
  title: string;
  description?: string;
  data: any;
  rawString: string;
  onDataChange: (newData: any) => void;
  onRawChange: (newString: string) => void;
  isLocked?: boolean; 
  headerAction?: React.ReactNode;
  defaultOpen?: boolean;
  pluginParams?: PluginParameterDefinition[];
  isUserInteraction?: boolean;
}> = ({ title, description, data, rawString, onDataChange, onRawChange, isLocked, headerAction, defaultOpen = true, pluginParams, isUserInteraction }) => {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [isValidJson, setIsValidJson] = useState(true);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleRawChange = (val: string) => {
    onRawChange(val);
    try {
      const parsed = JSON.parse(val);
      onDataChange(parsed);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  const handleKeyValueChange = (key: string, val: any) => {
    const newData = Array.isArray(data) ? [...data] : { ...data };
    if (Array.isArray(newData)) {
        newData[Number(key)] = val;
    } else {
        newData[key] = val;
    }
    onDataChange(newData);
    onRawChange(JSON.stringify(newData, null, 2));
  };
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border shadow-sm transition-colors ${isLocked ? 'border-blue-200 dark:border-blue-900/50' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className={`flex items-center justify-between p-3 border-b ${isLocked ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
            {isLocked && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800"><Link size={10}/> Linked</span>}
        </div>
        
        <div className="flex items-center gap-2">
            {headerAction}
            <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-md">
                <button
                    onClick={() => { setMode('form'); setIsOpen(true); }}
                    className={`p-1 rounded transition-all ${mode === 'form' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    title="Form View"
                >
                    <List size={14} />
                </button>
                <button
                    onClick={() => { setMode('json'); setIsOpen(true); }}
                    className={`p-1 rounded transition-all ${mode === 'json' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    title="JSON View"
                >
                    <Code size={14} />
                </button>
            </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-1">{description}</p>}
            
            {mode === 'form' ? (
                isUserInteraction ? (
                   <div className="space-y-4">
                       <div className="grid grid-cols-1 gap-4">
                           <Input
                               label="Form Title"
                               value={data.title || ''}
                               onChange={(e) => handleKeyValueChange('title', e.target.value)}
                           />
                           <Input
                               label="Description"
                               value={data.description || ''}
                               onChange={(e) => handleKeyValueChange('description', e.target.value)}
                           />
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fields</label>
                               <FormBuilder 
                                   fields={data.fields || []} 
                                   onChange={(fields) => handleKeyValueChange('fields', fields)} 
                               />
                           </div>
                       </div>
                   </div>
                ) : pluginParams ? (
                    <AutoForm data={data} paramDefs={pluginParams} onChange={onDataChange} disabled={isLocked} />
                ) : (
                    <KeyValueList data={data} onChange={handleKeyValueChange} disabled={isLocked} />
                )
            ) : (
            <div className="relative group">
                <textarea
                value={rawString}
                onChange={(e) => handleRawChange(e.target.value)}
                disabled={isLocked}
                className={`w-full h-64 p-3 text-xs font-mono border rounded-md bg-slate-50 dark:bg-slate-950 focus:ring-1 outline-none resize-y ${
                    isValidJson 
                    ? 'border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20' 
                    : 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="{}"
                spellCheck={false}
                />
                {!isValidJson && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-red-600 bg-white dark:bg-slate-800 px-2 py-1.5 rounded shadow-md border border-red-100 dark:border-red-900/50">
                        <AlertCircle size={12} /> Invalid JSON
                    </div>
                )}
            </div>
            )}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

interface EditorPanelProps {
  selectedNode: NodeDefinition | null;
  onRunNode?: () => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    selectedNode, 
    onRunNode
}) => {
  const { updateNode, deleteNode, workflowData } = useWorkflowStore();
  const { setModalOpen, setPanelOpen } = useUIStore();
  const { credentials } = useUserStore();

  const [activeTab, setActiveTab] = useState<'settings' | 'data'>('settings');
  const [formData, setFormData] = useState<NodeDefinition | null>(null);
  
  // Raw strings for JSON edit mode (synced with formData)
  const [rawParams, setRawParams] = useState<string>('');
  const [rawCreds, setRawCreds] = useState<string>('');
  const [rawGlobal, setRawGlobal] = useState<string>('');

  // Sync state when selection changes
  useEffect(() => {
    if (selectedNode) {
      setFormData(JSON.parse(JSON.stringify(selectedNode)));
      setRawParams(JSON.stringify(selectedNode.parameters || {}, null, 2));
      setRawCreds(JSON.stringify(selectedNode.credentials || {}, null, 2));
      setRawGlobal(JSON.stringify(selectedNode.global || {}, null, 2));
      setActiveTab('settings');
    } else {
      setFormData(null);
    }
  }, [selectedNode]);

  const handleUpdate = (field: keyof NodeDefinition, value: any) => {
    if (!formData) return;
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    // Auto-save to store
    updateNode(updated);
  };

  const handleRun = () => {
      if (onRunNode) onRunNode();
  };

  const handleDelete = () => {
      if (selectedNode && confirm(`Delete node "${selectedNode.name}"?`)) {
          deleteNode(selectedNode.name);
          setPanelOpen('isRightPanelOpen', false);
      }
  };

  // Resolve Schema from Registry
  const nodePlugin = selectedNode ? Registry.get(selectedNode.type) : undefined;
  const pluginParams = nodePlugin?.template.parameterDefinitions; 
  
  // Resolve Icon
  const Icon = nodePlugin ? (IconMap[nodePlugin.visuals.icon] || Settings) : Settings;

  if (!selectedNode || !formData) {
      return (
          <div className="h-full flex items-center justify-center text-slate-400">
              Select a node to edit
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm ${nodePlugin?.visuals.color || 'text-slate-500'}`}>
                <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <Input
                    value={formData.name}
                    onChange={(e) => handleUpdate('name', e.target.value)}
                    className="font-bold text-sm bg-transparent border-transparent hover:border-slate-300 focus:bg-white dark:focus:bg-slate-900 px-1 py-0.5 h-auto w-full"
                    placeholder="Node Name"
                />
                <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
                    <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{formData.type}</span>
                    {nodePlugin?.category && <span className="uppercase tracking-wider">{nodePlugin.category}</span>}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleRun}
                title="Run Node"
                className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
                <Play size={18} />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title="Delete Node"
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
                <Trash2 size={18} />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen('isRightPanelOpen', false)}
            >
                <X size={18} />
            </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
              Settings
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
              Variables
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          {activeTab === 'settings' ? (
              <div className="p-4 space-y-6">
                  {/* Description Field */}
                  <div>
                      <Input
                          label="Description"
                          value={formData.desc || ''}
                          onChange={(e) => handleUpdate('desc', e.target.value)}
                          placeholder="Describe what this node does..."
                          className="bg-white dark:bg-slate-900"
                      />
                  </div>

                  {/* Parameters Section */}
                  <SectionEditor 
                      title="Parameters"
                      description="Configure inputs and behavior."
                      data={formData.parameters || {}}
                      rawString={rawParams}
                      onDataChange={(d) => handleUpdate('parameters', d)}
                      onRawChange={setRawParams}
                      pluginParams={pluginParams}
                      isUserInteraction={formData.type === 'user_interaction'}
                  />

                  {/* Credentials Section */}
                  <SectionEditor 
                      title="Authentication"
                      description="Manage API keys and secrets."
                      data={formData.credentials || {}}
                      rawString={rawCreds}
                      onDataChange={(d) => handleUpdate('credentials', d)}
                      onRawChange={setRawCreds}
                      defaultOpen={false}
                      isLocked={!!formData.secret} // Lock manual editing if secret is linked
                      headerAction={
                          <div className="flex items-center gap-2">
                              {formData.secret ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 text-[10px]"
                                    onClick={() => handleUpdate('secret', undefined)}
                                  >
                                      Unlink Secret
                                  </Button>
                              ) : (
                                  <Select 
                                    className="h-6 text-[10px] w-32 py-0"
                                    value=""
                                    onChange={(e) => {
                                        const secretId = e.target.value;
                                        if (secretId) {
                                            const secret = credentials.find(c => c.id === secretId);
                                            if (secret) {
                                                handleUpdate('secret', {
                                                    secret_id: secret.id,
                                                    secret_name: secret.name,
                                                    secret_type: secret.type
                                                });
                                                handleUpdate('credentials', secret.data);
                                            }
                                        } else if (e.target.value === 'manage') {
                                            setModalOpen('secretsManagerOpen', true);
                                        }
                                    }}
                                    options={[
                                        { label: "Link Secret...", value: "" },
                                        ...credentials.map(c => ({ label: c.name, value: c.id })),
                                        { label: "+ Manage Secrets", value: "manage" }
                                    ]}
                                  />
                              )}
                          </div>
                      }
                  />

                  {/* Global Overrides */}
                  <SectionEditor 
                      title="Global Overrides"
                      description="Set variables specific to this node execution context."
                      data={formData.global || {}}
                      rawString={rawGlobal}
                      onDataChange={(d) => handleUpdate('global', d)}
                      onRawChange={setRawGlobal}
                      defaultOpen={false}
                  />
                  
                  {/* Plugin Info Footer */}
                  {nodePlugin && (
                      <div className="text-[10px] text-slate-400 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                          Plugin: <span className="font-mono">{nodePlugin.type}</span> • Category: <span className="font-mono">{nodePlugin.category}</span>
                      </div>
                  )}
              </div>
          ) : (
              <VariableExplorer selectedNodeName={selectedNode.name} />
          )}
      </div>
    </div>
  );
};

export default EditorPanel;
