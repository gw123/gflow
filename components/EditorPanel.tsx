


import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Code, List, AlertCircle, Check, Link, Settings, Info, Maximize2, Minimize2, Plus, FileText, Plug } from 'lucide-react';
import { NodeDefinition, CredentialItem, PluginParameterDefinition, InputFieldDefinition } from '../types';
import { FormBuilder } from './FormBuilder';

interface EditorPanelProps {
  selectedNode: NodeDefinition | null;
  onClose: () => void;
  onSave: (node: NodeDefinition) => void;
  onDelete: (nodeName: string) => void;
  availableCredentials?: CredentialItem[];
  onOpenSecretsManager?: () => void;
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
     // If value becomes an object externally and we are in text mode, switch to json? 
     // Or just let the user toggle. We'll stick to manual toggle but sync initial state if undefined.
     if (typeof value === 'object' && value !== null && mode === 'text') {
         // Only switch if we are sure? No, user might be typing a JSON string in text mode.
         // Let's keep manual control mostly, but if it's clearly an object, prefer JSON.
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
  
  // If plugin params are present, default to form mode and maybe disable toggling if strict?
  // For now, we allow toggle but form view renders specific inputs.

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

// --- Main Component ---

const EditorPanel: React.FC<EditorPanelProps> = ({ selectedNode, onClose, onSave, onDelete, availableCredentials = [], onOpenSecretsManager }) => {
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
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm border-l border-slate-200 dark:border-slate-800 shadow-2xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
        <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Edit Node</h2>
            <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{formData.name}</p>
                {isPlugin && (
                    <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 rounded text-[9px] font-bold border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                        <Plug size={8} /> PLUGIN
                    </span>
                )}
            </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        
        {/* Basic Info Card */}
        <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Name</label>
                <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
                {isPlugin ? (
                     <div className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed">
                         {formData.type}
                     </div>
                ) : (
                    <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                    {nodeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                    </select>
                )}
            </div>
          </div>
          
          {/* Description */}
          <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                <textarea
                value={formData.desc || ''}
                onChange={(e) => handleChange('desc', e.target.value)}
                className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-16"
                placeholder="Enter a brief description of this node..."
                />
          </div>

          {['timer', 'feishu_bitable'].includes(formData.type) && (
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Init Delay (ms)</label>
                <input
                    type="number"
                    value={formData.init_delay || 0}
                    onChange={(e) => handleChange('init_delay', parseInt(e.target.value))}
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
          )}
        </div>

        {/* Parameters Section */}
        <SectionEditor 
            title={isPlugin ? "Plugin Configuration" : (formData.type === 'user_interaction' ? "Interaction Form" : "Parameters")}
            description={isPlugin ? "Configure specific settings defined by this plugin." : "Configure logic parameters and inputs"}
            data={formData.parameters || {}}
            rawString={rawParams}
            onDataChange={(newData) => handleChange('parameters', newData)}
            onRawChange={setRawParams}
            pluginParams={formData.meta?.parameters}
            isUserInteraction={formData.type === 'user_interaction'}
        />

        {/* Credentials Section */}
        {showCredEditor && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        Authentication
                    </h3>
                    <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-md">
                        <button 
                            onClick={() => toggleCredMode('direct')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${credMode === 'direct' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Inline
                        </button>
                        <button 
                            onClick={() => toggleCredMode('reference')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${credMode === 'reference' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Managed
                        </button>
                    </div>
                </div>
                
                <div className="p-4">
                    {credMode === 'reference' ? (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select Credential</label>
                                <div className="flex items-stretch gap-2">
                                    <div className="relative flex-1">
                                        <select
                                            value={formData.secret?.secret_id || ""}
                                            onChange={(e) => handleSecretSelection(e.target.value)}
                                            className={`w-full p-2.5 pl-3 pr-8 text-sm border rounded-md appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${formData.secret ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100' : 'bg-slate-50 border-slate-300 dark:bg-slate-900 dark:border-slate-600'}`}
                                        >
                                            <option value="">-- No Secret Linked --</option>
                                            {availableCredentials.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} • {c.type}
                                                </option>
                                            ))}
                                        </select>
                                        {formData.secret && <Link size={14} className="absolute right-3 top-3 text-blue-500 pointer-events-none" />}
                                    </div>
                                    
                                    <button 
                                        onClick={onOpenSecretsManager}
                                        className="px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-md transition-colors flex items-center justify-center"
                                        title="Open Secrets Manager"
                                    >
                                        <Settings size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            {formData.secret ? (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
                                        <Check size={14} className="stroke-[3]" />
                                        <span className="text-xs font-bold uppercase">Linked Successfully</span>
                                    </div>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                                        <span className="font-medium text-right">Name:</span> 
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{formData.secret.secret_name}</span>
                                        
                                        <span className="font-medium text-right">Type:</span> 
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{formData.secret.secret_type}</span>
                                        
                                        <span className="font-medium text-right">ID:</span> 
                                        <span className="font-mono text-slate-500 truncate">{formData.secret.secret_id}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-md text-center">
                                    <p className="text-xs text-slate-400">Select a managed secret to link credentials to this node.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <SectionEditor 
                            title="" 
                            data={formData.credentials || {}}
                            rawString={rawCreds}
                            onDataChange={(newData) => handleChange('credentials', newData)}
                            onRawChange={setRawCreds}
                            defaultOpen={true}
                        />
                    )}
                </div>
            </div>
        )}

        {/* Advanced / Output Section */}
        <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Output & Artifacts</h3>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Global Output</label>
                <JsonEditor 
                    value={formData.global || {}} 
                    onChange={(val) => handleChange('global', val)}
                    minHeight="100px"
                />
            </div>

            {formData.type === 'tts' && (
                <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Artifact Configuration</label>
                    <JsonEditor 
                        value={formData.artifact || {}} 
                        onChange={(val) => handleChange('artifact', val)}
                        minHeight="100px"
                    />
                </div>
            )}
            
            {formData.type === 'webhook' && (
                 <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Legacy Secret</label>
                    <JsonEditor 
                        value={formData.secret || {}} 
                        onChange={(val) => handleChange('secret', val)}
                        minHeight="100px"
                    />
                 </div>
            )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
        {statusMessage && (
          <div className={`mb-3 p-2 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all duration-300 ${
            saveStatus === 'success' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900'
          }`}>
             {saveStatus === 'success' ? <Check size={14}/> : <AlertCircle size={14}/>}
             {statusMessage}
          </div>
        )}
        
        <div className="flex gap-3">
            <button
            onClick={handleSave}
            disabled={saveStatus === 'success'}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-semibold text-sm shadow-sm transition-all duration-200 ${
                saveStatus === 'success' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : saveStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            >
            {saveStatus === 'success' ? <Check size={18} /> : <Save size={18} />} 
            {saveStatus === 'success' ? 'Saved Successfully' : 'Save Changes'}
            </button>
            <button
            onClick={() => onDelete(formData.name)}
            className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 py-2 px-4 rounded-md font-medium transition-colors border border-red-100 dark:border-red-900/50"
            title="Delete Node"
            >
            <Trash2 size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
