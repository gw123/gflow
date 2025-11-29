import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Trash2, Code, List, AlertCircle, Check, Link, Settings, Info, Maximize2, Minimize2, Plus, FileText, Plug, Database, Copy, ChevronRight, ChevronDown, Play, Pin } from 'lucide-react';
import { NodeDefinition, CredentialItem, PluginParameterDefinition, InputFieldDefinition, WorkflowExecutionState, WorkflowDefinition } from '../types';
import { FormBuilder } from './FormBuilder';

interface EditorPanelProps {
  selectedNode: NodeDefinition | null;
  onClose: () => void;
  onSave: (node: NodeDefinition) => void;
  onDelete: (nodeName: string) => void;
  availableCredentials?: CredentialItem[];
  onOpenSecretsManager?: () => void;
  executionState: WorkflowExecutionState;
  workflowData: WorkflowDefinition;
  onRunNode?: () => void;
  onPinData?: () => void;
}

// --- Helper Components ---

export const JsonEditor: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  disabled?: boolean;
  minHeight?: string;
}> = ({ value, onChange, disabled, minHeight = "120px" }) => {
  const [localValue, setLocalValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(JSON.stringify(value, null, 2));
      setError(null);
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    try {
      const parsed = JSON.parse(localValue);
      onChange(parsed);
      setError(null);
    } catch (e) {
      setError("Invalid JSON");
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        value={localValue}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
            setLocalValue(e.target.value);
            setError(null); 
        }}
        onBlur={handleBlur}
        spellCheck={false}
        style={{ minHeight }}
        className={`w-full text-xs p-2 font-mono border rounded-md bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none resize-y transition-all ${
            error 
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
            : disabled 
                ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
        }`}
      />
      <div className="absolute top-2 right-2 pointer-events-none opacity-50">
           <span className="text-[9px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5 rounded">JSON</span>
      </div>
      {error && (
          <div className="absolute bottom-2 right-2 text-[10px] text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800 flex items-center gap-1 shadow-sm">
              <AlertCircle size={10} /> {error}
          </div>
      )}
    </div>
  );
};

const BodyEditor: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  disabled?: boolean; 
}> = ({ value, onChange, disabled }) => {
  const [mode, setMode] = useState<'json' | 'text'>(
      typeof value === 'object' && value !== null ? 'json' : 'text'
  );

  useEffect(() => {
     if (typeof value === 'object' && value !== null && mode === 'text') {
         // Keep manual control for text mode but prefer json if object
     }
  }, [value]); // eslint-disable-line

  const handleModeSwitch = (newMode: 'json' | 'text') => {
      if (newMode === mode) return;

      if (newMode === 'text') {
          // Object -> String
          if (typeof value === 'object' && value !== null) {
              onChange(JSON.stringify(value, null, 2));
          } else {
              onChange(String(value || ''));
          }
      } else {
          // String -> Object
          if (typeof value === 'string') {
              try {
                  const parsed = JSON.parse(value);
                  onChange(parsed);
              } catch (e) {
                   if (!confirm("Content is not valid JSON. Discard and create empty object?")) {
                       return;
                   }
                   onChange({});
              }
          } else {
              // Number or other types
              onChange({});
          }
      }
      setMode(newMode);
  };

  return (
     <div className="w-full pt-2 pb-1">
         <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                 <FileText size={12}/> Request Body
             </span>
             <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-md">
                <button 
                    onClick={() => handleModeSwitch('json')}
                    disabled={disabled}
                    className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${mode === 'json' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    JSON
                </button>
                <button 
                    onClick={() => handleModeSwitch('text')}
                    disabled={disabled}
                    className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    Text
                </button>
             </div>
         </div>
         
         {mode === 'json' ? (
             <JsonEditor value={value} onChange={onChange} disabled={disabled} minHeight="200px" />
         ) : (
             <div className="relative">
                 <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full h-[200px] text-xs p-3 font-mono border rounded-md bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none resize-y transition-all ${
                        disabled 
                        ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                    }`}
                    placeholder="Raw body content (e.g. plain text, XML, etc.)"
                    spellCheck={false}
                 />
                 <div className="absolute top-2 right-2 pointer-events-none opacity-50">
                     <span className="text-[9px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5 rounded">RAW</span>
                 </div>
             </div>
         )}
     </div>
  );
};

const KeyValueMapEditor: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const [items, setItems] = useState<{id: string, key: string, value: string}[]>([]);

  useEffect(() => {
    const obj = value || {};
    // Compare current items (as object) with incoming object to avoid unnecessary updates/re-renders
    const currentObj = items.reduce((acc, item) => {
        if (item.key) acc[item.key] = item.value;
        return acc;
    }, {} as any);
    
    if (JSON.stringify(obj) !== JSON.stringify(currentObj)) {
        const newItems = Object.entries(obj).map(([k, v]) => ({
            id: k + '-' + Math.random().toString(36).substr(2, 5),
            key: k,
            value: String(v)
        }));
        setItems(newItems);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateParent = (newItems: typeof items) => {
     const newObj = newItems.reduce((acc, item) => {
        if (item.key.trim()) acc[item.key.trim()] = item.value;
        return acc;
     }, {} as any);
     onChange(newObj);
  };

  const handleChange = (id: string, field: 'key'|'value', val: string) => {
     const newItems = items.map(i => i.id === id ? { ...i, [field]: val } : i);
     setItems(newItems);
     updateParent(newItems);
  };

  const handleAdd = () => {
     setItems([...items, { id: Math.random().toString(), key: '', value: '' }]);
  };

  const handleDelete = (id: string) => {
     const newItems = items.filter(i => i.id !== id);
     setItems(newItems);
     updateParent(newItems);
  };

  return (
    <div className="flex flex-col gap-2 w-full pt-1">
        {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center">
                <input
                    value={item.key}
                    onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                    placeholder="Key"
                    disabled={disabled}
                    className="flex-1 min-w-0 w-1/3 text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <input
                    value={item.value}
                    onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                    placeholder="Value"
                    disabled={disabled}
                    className="flex-1 min-w-0 w-2/3 text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <button 
                    onClick={() => handleDelete(item.id)}
                    disabled={disabled}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Remove Header"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        ))}
        {!disabled && (
            <button 
                onClick={handleAdd}
                className="self-start flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors font-medium"
            >
                <Plus size={14} /> Add Header
            </button>
        )}
        {items.length === 0 && (
             <div className="text-[10px] text-slate-400 italic px-1">No headers defined</div>
        )}
    </div>
  );
};

const ValueInput: React.FC<{ value: any; onChange: (val: any) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  // Detect type
  const isBool = typeof value === 'boolean';
  const isObject = value !== null && typeof value === 'object';
  const isNumber = typeof value === 'number';
  
  // For simple inputs
  const [localValue, setLocalValue] = useState<string>('');
  
  useEffect(() => {
      if (!isObject && !isBool) {
          setLocalValue(String(value ?? ''));
      }
  }, [value, isObject, isBool]);

  const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLocalValue(e.target.value);
  };

  const handleSimpleBlur = () => {
      if (isNumber) {
          const num = Number(localValue);
          if (!isNaN(num)) onChange(num);
          else onChange(localValue); // Fallback to string if invalid number
      } else {
          onChange(localValue);
      }
  };

  if (isBool) {
    return (
      <div className="flex items-center h-9">
        <button
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            value ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              value ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{value ? 'True' : 'False'}</span>
      </div>
    );
  }

  if (isObject) {
    return <JsonEditor value={value} onChange={onChange} disabled={disabled} />;
  }

  const isLongString = typeof value === 'string' && (value.length > 60 || value.includes('\n'));

  if (isLongString) {
     return (
        <textarea
          value={localValue}
          disabled={disabled}
          onChange={handleSimpleChange}
          onBlur={handleSimpleBlur}
          className={`w-full text-xs p-2 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none resize-y min-h-[80px] transition-all ${
              disabled 
              ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
          }`}
        />
     );
  }

  return (
    <input
      type={isNumber ? "number" : "text"}
      value={localValue}
      disabled={disabled}
      onChange={handleSimpleChange}
      onBlur={handleSimpleBlur}
      className={`w-full text-xs px-2 py-1.5 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-all ${
          disabled 
          ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
      }`}
    />
  );
};

const DynamicFormEditor: React.FC<{ 
  data: any; 
  paramDefs: PluginParameterDefinition[]; 
  onChange: (newData: any) => void;
  disabled?: boolean;
}> = ({ data, paramDefs, onChange, disabled }) => {
    
    const handleChange = (key: string, val: any) => {
        onChange({ ...data, [key]: val });
    };

    return (
        <div className="flex flex-col gap-4">
            {paramDefs.map((def) => {
                const value = data[def.name] ?? def.defaultValue;
                
                return (
                    <div key={def.name} className="group relative">
                         <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-2">
                                 <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono break-all">
                                     {def.name}
                                 </label>
                                 {def.required && <span className="text-[10px] text-red-500">*</span>}
                                 <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">{def.type}</span>
                             </div>
                             
                             {def.description && (
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5">{def.description}</p>
                             )}

                             <div className="mt-1">
                                 {(def.type === 'bool' || def.type === 'boolean') ? (
                                      <div className="flex items-center h-9">
                                        <button
                                          onClick={() => !disabled && handleChange(def.name, !value)}
                                          disabled={disabled}
                                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                            value ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
                                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{value ? 'True' : 'False'}</span>
                                      </div>
                                 ) : (def.type === 'int' || def.type === 'integer' || def.type === 'float' || def.type === 'double' || def.type === 'number') ? (
                                     <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => {
                                            const val = def.type.includes('int') ? parseInt(e.target.value) : parseFloat(e.target.value);
                                            handleChange(def.name, isNaN(val) ? e.target.value : val);
                                        }}
                                        disabled={disabled}
                                        className={`w-full text-xs px-2 py-1.5 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${disabled ? 'opacity-60 cursor-not-allowed border-gray-200' : 'border-gray-300 dark:border-gray-600'}`}
                                     />
                                 ) : (def.type === 'object' || def.type === 'array') ? (
                                     <JsonEditor value={value} onChange={(v) => handleChange(def.name, v)} disabled={disabled} />
                                 ) : (
                                     <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => handleChange(def.name, e.target.value)}
                                        disabled={disabled}
                                        placeholder={def.defaultValue}
                                        className={`w-full text-xs px-2 py-1.5 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${disabled ? 'opacity-60 cursor-not-allowed border-gray-200' : 'border-gray-300 dark:border-gray-600'}`}
                                     />
                                 )}
                             </div>
                         </div>
                    </div>
                );
            })}
        </div>
    );
};

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
              {/* Key Label */}
              <div className={`${key === 'body' ? 'w-full' : 'w-full md:w-1/3'} pt-1.5 flex items-center`}>
                 <label 
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono break-all" 
                    title={key}
                 >
                     {key}
                 </label>
              </div>
              
              {/* Value Input */}
              <div className={`${key === 'body' ? 'w-full' : 'w-full md:w-2/3'}`}>
                 {/* Special handling for headers */}
                 {key === 'headers' && typeof value === 'object' ? (
                     <KeyValueMapEditor value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 ) : key === 'body' ? (
                     <BodyEditor value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 ) : (
                     <ValueInput value={value} onChange={(newVal) => onChange(key, newVal)} disabled={disabled} />
                 )}
              </div>
           </div>
           {/* Separator */}
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
  // Dynamic Plugin Support
  pluginParams?: PluginParameterDefinition[];
  // Interaction Node Support
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
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${isLocked ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
            {isLocked && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800"><Link size={10}/> Linked</span>}
        </div>
        
        <div className="flex items-center gap-2">
            {headerAction}
            
            {/* View Toggle */}
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

      {/* Content */}
      {isOpen && (
        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-1">{description}</p>}
            
            {mode === 'form' ? (
                isUserInteraction ? (
                   <div className="space-y-4">
                       <div className="grid grid-cols-1 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Form Title</label>
                               <input 
                                   type="text" 
                                   value={data.title || ''} 
                                   onChange={(e) => handleKeyValueChange('title', e.target.value)}
                                   className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                               <input 
                                   type="text" 
                                   value={data.description || ''} 
                                   onChange={(e) => handleKeyValueChange('description', e.target.value)}
                                   className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900"
                               />
                           </div>
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
                    <DynamicFormEditor data={data} paramDefs={pluginParams} onChange={onDataChange} disabled={isLocked} />
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
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-500"
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
    executionState: WorkflowExecutionState; 
    workflowData: WorkflowDefinition;
    selectedNodeName: string;
}> = ({ executionState, workflowData, selectedNodeName }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        const interpolation = `{{ ${text} }}`;
        navigator.clipboard.writeText(interpolation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Calculate upstream nodes for context
    const upstreamNodes = useMemo(() => {
        const upstream = new Set<string>();
        // Very basic reachability: Any node executed before this one could be relevant
        // But for $P context, strictly it's parent nodes. 
        // We will list all executed nodes as "Available Data"
        return Object.keys(executionState.nodeResults).filter(n => n !== selectedNodeName);
    }, [executionState, selectedNodeName]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
             {copied && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
                    Copied!
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
                                                path={`$node["${nodeName}"].output`} // Standard n8n-like syntax
                                                onCopy={handleCopy} 
                                            />
                                         </div>
                                     </div>
                                 );
                             })
                         )}
                     </div>
                 </div>

                 {/* Flattened Inputs ($P) */}
                 <div>
                    <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                         <List size={12} className="text-green-500"/> Input Context ($P)
                     </div>
                     <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2">
                         {upstreamNodes.length > 0 ? (
                             <p className="text-[10px] text-slate-400 mb-2">
                                 Merged outputs from previous nodes available directly.
                             </p>
                         ) : null}
                         {/* We can approximate $P by merging all outputs, but in the UI it's better to guide them to specific nodes. 
                             We will just show a tip here or listing specific merged keys if we tracked them properly in state. 
                             For now, let's just hint.
                          */}
                         <div className="text-[10px] text-slate-500">
                             Use <code>$P.variable</code> to access flattened inputs. <br/>
                             Example: <code>{'{{ $P.id }}'}</code>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};


// --- Main Component ---

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    selectedNode, 
    onClose, 
    onSave, 
    onDelete, 
    availableCredentials = [], 
    onOpenSecretsManager, 
    executionState, 
    workflowData, 
    onRunNode, 
    onPinData 
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'data'>('settings');
  const [formData, setFormData] = useState<NodeDefinition | null>(null);
  
  // Raw strings for JSON edit mode (synced with formData)
  const [rawParams, setRawParams] = useState<string>('');
  const [rawCreds, setRawCreds] = useState<string>('');
  const [rawGlobal, setRawGlobal] = useState<string>('');
  const [rawArtifact, setRawArtifact] = useState<string>('');
  const [rawSecret, setRawSecret] = useState<string>('');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [credMode, setCredMode] = useState<'direct' | 'reference'>('direct');

  useEffect(() => {
    if (selectedNode) {
      const data = JSON.parse(JSON.stringify(selectedNode));
      setFormData(data);
      
      setRawParams(JSON.stringify(data.parameters || {}, null, 2));
      setRawCreds(JSON.stringify(data.credentials || {}, null, 2));
      setRawGlobal(JSON.stringify(data.global || {}, null, 2));
      setRawArtifact(JSON.stringify(data.artifact || {}, null, 2));
      setRawSecret(JSON.stringify(data.secret || {}, null, 2));
      
      if (data.secret) {
          setCredMode('reference');
      } else {
          setCredMode('direct');
      }

      setSaveStatus('idle');
      setStatusMessage('');
      setActiveTab('settings'); // Reset to settings on node change
    } else {
      setFormData(null);
    }
  }, [selectedNode]);

  const handleChange = (field: keyof NodeDefinition, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
      setSaveStatus('idle');
    }
  };

  const handleSecretSelection = (secretId: string) => {
      if (!formData) return;
      
      if (secretId === "") {
          const newFormData = { ...formData };
          delete newFormData.secret;
          setFormData(newFormData);
      } else {
          const cred = availableCredentials.find(c => c.id === secretId || String(c.id) === secretId);
          if (cred) {
              const newFormData = { 
                  ...formData,
                  secret: {
                      secret_type: cred.type,
                      secret_name: cred.name,
                      secret_id: cred.id
                  }
              };
              delete newFormData.credentials; 
              setFormData(newFormData);
              setRawCreds("{}");
          }
      }
  };

  const toggleCredMode = (mode: 'direct' | 'reference') => {
      setCredMode(mode);
      if (mode === 'direct' && formData?.secret) {
          const newFormData = { ...formData, credentials: {} };
          delete newFormData.secret;
          setFormData(newFormData);
          setRawCreds("{}");
      }
  };

  const handleSave = () => {
    if (!formData) return;
    setSaveStatus('idle');
    setStatusMessage('');

    try {
      try { JSON.parse(rawParams); } catch(e) { throw new Error("Parameters: Invalid JSON format"); }
      
      if (credMode === 'direct' && (formData.credentials || ['mysql', 'pg', 'feishu_bitable', 'text2sql', 'tts', 'chatgpt'].includes(formData.type))) {
          try { JSON.parse(rawCreds); } catch(e) { throw new Error("Credentials: Invalid JSON format"); }
      }
      
      try { JSON.parse(rawGlobal); } catch(e) { throw new Error("Global Output: Invalid JSON format"); }
      
      if (formData.type === 'tts') {
           try { JSON.parse(rawArtifact); } catch(e) { throw new Error("Artifact: Invalid JSON format"); }
      }

      if (formData.type === 'webhook') {
           try { JSON.parse(rawSecret); } catch(e) { throw new Error("Secret: Invalid JSON format"); }
      }

      onSave(formData);
      
      setSaveStatus('success');
      setStatusMessage('Node saved successfully');
      setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage('');
      }, 2000);
    } catch (e: any) {
      setSaveStatus('error');
      setStatusMessage(e.message || "Error saving node");
      setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage('');
      }, 3000);
    }
  };

  if (!selectedNode || !formData) return <div className="h-full flex items-center justify-center text-slate-400">Select a node</div>;

  const nodeTypes = [
    "webhook", "project", "prompt_template", "chatgpt", "code_search", 
    "loop", "js", "ai_low_code", "text2sql", "low_code", "pg", 
    "tts", "wait", "debug", "mysql", "timer", "feishu_bitable", "docker_compose",
    "grpc_plugin", "user_interaction"
  ];

  const showCredEditor = formData.credentials || formData.secret || ['mysql', 'pg', 'feishu_bitable', 'text2sql', 'tts', 'chatgpt', 'webhook', 'prompt_template', 'code_search'].includes(formData.type) || formData['credentialType'];

  // Check if this node is a plugin with metadata
  const isPlugin = !!formData.meta;

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm border-l border-slate-200 dark:border-slate-800">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
         <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
             <Settings size={18} className="text-blue-600 dark:text-blue-400" />
             <span className="truncate max-w-[200px]">{formData.name}</span>
         </div>
         <div className="flex items-center gap-1">
             <button 
                onClick={onRunNode}
                className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Run this node only"
             >
                <Play size={18} />
             </button>
             {onPinData && (
                 <button 
                    onClick={onPinData}
                    className={`p-1.5 rounded transition-colors ${
                        workflowData.pinData?.[formData.name] 
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                    title="Pin output data"
                 >
                    <Pin size={18} />
                 </button>
             )}
             <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={20} />
             </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button 
             onClick={() => setActiveTab('settings')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
             Configuration
          </button>
          <button 
             onClick={() => setActiveTab('data')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
             Variables & Output
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'settings' ? (
              <>
                  {/* Common Settings */}
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Node Name</label>
                          <input 
                              type="text" 
                              value={formData.name}
                              onChange={(e) => handleChange('name', e.target.value)}
                              className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Node Type</label>
                          <select 
                              value={formData.type}
                              onChange={(e) => handleChange('type', e.target.value)}
                              className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                              {nodeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>

                      {/* Credentials / Secrets */}
                      {showCredEditor && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                               <div className="flex items-center justify-between mb-3">
                                   <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
                                       <Plug size={14} /> Authentication
                                   </h3>
                                   <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded">
                                       <button 
                                          onClick={() => toggleCredMode('direct')}
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${credMode === 'direct' ? 'bg-white dark:bg-slate-600 shadow text-blue-600' : 'text-slate-500'}`}
                                       >
                                          Custom
                                       </button>
                                       <button 
                                          onClick={() => toggleCredMode('reference')}
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${credMode === 'reference' ? 'bg-white dark:bg-slate-600 shadow text-blue-600' : 'text-slate-500'}`}
                                       >
                                          Managed
                                       </button>
                                   </div>
                               </div>
                               
                               {credMode === 'reference' ? (
                                   <div className="flex gap-2">
                                       <select 
                                           value={formData.secret?.secret_id || ""}
                                           onChange={(e) => handleSecretSelection(e.target.value)}
                                           className="flex-1 p-2 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                       >
                                           <option value="">-- Select Secret --</option>
                                           {availableCredentials.map(c => (
                                               <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                           ))}
                                       </select>
                                       <button 
                                            onClick={onOpenSecretsManager}
                                            className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded hover:bg-blue-200 transition-colors"
                                            title="Manage Secrets"
                                       >
                                           <Settings size={14} />
                                       </button>
                                   </div>
                               ) : (
                                   <SectionEditor 
                                      title="Credentials Config" 
                                      data={formData.credentials || {}}
                                      rawString={rawCreds}
                                      onDataChange={(d) => handleChange('credentials', d)}
                                      onRawChange={setRawCreds}
                                      defaultOpen={true}
                                   />
                               )}
                          </div>
                      )}
                  </div>
                  
                  {/* Parameters */}
                  <SectionEditor 
                      title="Parameters"
                      description={formData.desc}
                      data={formData.parameters || {}}
                      rawString={rawParams}
                      onDataChange={(d) => handleChange('parameters', d)}
                      onRawChange={setRawParams}
                      pluginParams={isPlugin ? formData.meta?.parameters : undefined}
                      isUserInteraction={formData.type === 'user_interaction'}
                  />

                  {/* Artifacts (Conditional) */}
                  {formData.type === 'tts' && (
                       <SectionEditor 
                          title="Artifact Configuration"
                          description="Configure where to store the generated audio file"
                          data={formData.artifact || {}}
                          rawString={rawArtifact}
                          onDataChange={(d) => handleChange('artifact', d)}
                          onRawChange={setRawArtifact}
                       />
                  )}
                  
                  {/* Global Output */}
                  <SectionEditor 
                      title="Global Output Mapping" 
                      description="Map node outputs to global workflow variables"
                      data={formData.global || {}}
                      rawString={rawGlobal}
                      onDataChange={(d) => handleChange('global', d)}
                      onRawChange={setRawGlobal}
                      defaultOpen={false}
                  />

                  {/* Plugin Metadata (Read Only) */}
                  {isPlugin && formData.meta && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase">Plugin Metadata</h4>
                          <pre className="text-[10px] font-mono whitespace-pre-wrap text-slate-500">
                              {JSON.stringify(formData.meta, null, 2)}
                          </pre>
                      </div>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                      <button 
                          onClick={() => onDelete(formData.name)}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs font-bold"
                      >
                          <Trash2 size={16} /> Delete Node
                      </button>
                      <button 
                          onClick={handleSave}
                          disabled={saveStatus === 'success'}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                              saveStatus === 'success' 
                              ? 'bg-green-600 text-white' 
                              : saveStatus === 'error'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                      >
                          {saveStatus === 'success' ? <Check size={16} /> : <Save size={16} />}
                          {saveStatus === 'success' ? 'Saved' : 'Save Changes'}
                      </button>
                  </div>
                  {statusMessage && (
                      <div className={`text-center text-xs mt-2 ${saveStatus === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                          {statusMessage}
                      </div>
                  )}
              </>
          ) : (
              <VariableExplorer 
                  executionState={executionState} 
                  workflowData={workflowData} 
                  selectedNodeName={formData.name}
              />
          )}
      </div>
    </div>
  );
};

export default EditorPanel;