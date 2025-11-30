
import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, Trash2, Plus } from 'lucide-react';
import { cn } from './utils';

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
        className={cn(
            "w-full text-xs p-2 font-mono border rounded-md bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none resize-y transition-all",
            error 
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
            : disabled 
                ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
        )}
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

export const BodyEditor: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  disabled?: boolean; 
}> = ({ value, onChange, disabled }) => {
  const [mode, setMode] = useState<'json' | 'text'>(
      typeof value === 'object' && value !== null ? 'json' : 'text'
  );

  const handleModeSwitch = (newMode: 'json' | 'text') => {
      if (newMode === mode) return;

      if (newMode === 'text') {
          if (typeof value === 'object' && value !== null) {
              onChange(JSON.stringify(value, null, 2));
          } else {
              onChange(String(value || ''));
          }
      } else {
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
                    className={cn(
                        "w-full h-[200px] text-xs p-3 font-mono border rounded-md bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none resize-y transition-all",
                        disabled 
                        ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                    )}
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

export const KeyValueMapEditor: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const [items, setItems] = useState<{id: string, key: string, value: string}[]>([]);

  useEffect(() => {
    const obj = value || {};
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
  }, [value]); 

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

export const ValueInput: React.FC<{ value: any; onChange: (val: any) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const isBool = typeof value === 'boolean';
  const isObject = value !== null && typeof value === 'object';
  const isNumber = typeof value === 'number';
  
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
          else onChange(localValue);
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
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            value ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
              value ? 'translate-x-5' : 'translate-x-1'
            )}
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
          className={cn(
              "w-full text-xs p-2 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none resize-y min-h-[80px] transition-all",
              disabled 
              ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
          )}
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
      className={cn(
          "w-full text-xs px-2 py-1.5 border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-all",
          disabled 
          ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700' 
          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
      )}
    />
  );
};
