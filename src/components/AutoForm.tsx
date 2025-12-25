
import React, { useMemo } from 'react';
import { PluginParameterDefinition, ParameterDefinition, ParameterOption } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';
import { Textarea } from './ui/Textarea';
import { JsonEditor, KeyValueMapEditor } from './ui/Editors';
import { cn } from './ui/utils';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

// Type guard to check if it's the new ParameterDefinition format
function isNewParameterDef(def: PluginParameterDefinition | ParameterDefinition): def is ParameterDefinition {
  return 'ui_type' in def || 'display_name' in def;
}

// Evaluate show_when condition
function evaluateShowWhen(condition: string | undefined, data: Record<string, any>): boolean {
  if (!condition) return true;
  
  try {
    // Parse simple conditions like "action == 'navigate'" or "action == 'click' || action == 'fill'"
    // Replace variable names with actual values
    let evalStr = condition;
    
    // Find all variable references and replace them
    const varMatches = condition.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*[=!<>])/g);
    if (varMatches) {
      for (const varName of varMatches) {
        const value = data[varName];
        if (value !== undefined) {
          // Replace variable with its JSON value
          evalStr = evalStr.replace(new RegExp(`\\b${varName}\\b`, 'g'), JSON.stringify(value));
        }
      }
    }
    
    // Safe evaluation using Function constructor
    const result = new Function(`return ${evalStr}`)();
    return Boolean(result);
  } catch (e) {
    console.warn('[AutoForm] Failed to evaluate show_when condition:', condition, e);
    return true;
  }
}

interface AutoFormProps {
  data: any;
  paramDefs: (PluginParameterDefinition | ParameterDefinition)[];
  onChange: (newData: any) => void;
  disabled?: boolean;
}

// Group parameters by their group field
interface GroupedParams {
  basic: (PluginParameterDefinition | ParameterDefinition)[];
  advanced: (PluginParameterDefinition | ParameterDefinition)[];
  [key: string]: (PluginParameterDefinition | ParameterDefinition)[];
}

export const AutoForm: React.FC<AutoFormProps> = ({ data, paramDefs, onChange, disabled }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({ basic: true });
  
  const handleChange = (key: string, val: any) => {
    onChange({ ...data, [key]: val });
  };

  // Sort and group parameters
  const groupedParams = useMemo(() => {
    const groups: GroupedParams = { basic: [], advanced: [] };
    
    // Sort by order if available
    const sorted = [...paramDefs].sort((a, b) => {
      const orderA = isNewParameterDef(a) ? (a.order ?? 999) : 999;
      const orderB = isNewParameterDef(b) ? (b.order ?? 999) : 999;
      return orderA - orderB;
    });
    
    for (const def of sorted) {
      const group = isNewParameterDef(def) ? (def.group || 'basic') : 'basic';
      if (!groups[group]) groups[group] = [];
      groups[group].push(def);
    }
    
    return groups;
  }, [paramDefs]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const renderField = (def: PluginParameterDefinition | ParameterDefinition) => {
    // Check visibility condition for new format
    if (isNewParameterDef(def) && def.show_when) {
      if (!evaluateShowWhen(def.show_when, data)) {
        return null;
      }
    }

    const name = def.name;
    const label = isNewParameterDef(def) ? def.display_name : def.name;
    const description = def.description;
    const required = def.required;
    const hint = isNewParameterDef(def) ? def.hint : undefined;
    const placeholder = isNewParameterDef(def) ? def.placeholder : undefined;
    const validation = isNewParameterDef(def) ? def.validation : undefined;
    
    // Get default value
    const defaultValue = isNewParameterDef(def) 
      ? def.default_value?.value 
      : (def as PluginParameterDefinition).defaultValue;
    
    const value = data[name] ?? defaultValue;

    // Determine the UI type
    const uiType = isNewParameterDef(def) ? def.ui_type : undefined;
    const dataType = def.type;

    // Render based on ui_type (new format) or type (legacy format)
    
    // Select / Enum
    if (uiType === 'select' || (dataType === 'enum' && isNewParameterDef(def) && def.options)) {
      const options = isNewParameterDef(def) && def.options 
        ? def.options.map((opt: ParameterOption) => ({ 
            label: opt.label, 
            value: String(opt.value),
            description: opt.description 
          }))
        : [];
      
      return (
        <div key={name} className="space-y-1">
          <Select
            label={label}
            options={options}
            value={value ?? ''}
            onChange={(e) => handleChange(name, e.target.value)}
            disabled={disabled}
            required={required}
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Switch / Boolean
    if (uiType === 'switch' || dataType === 'bool' || dataType === 'boolean') {
      return (
        <div key={name} className="space-y-1">
          <Switch
            label={label}
            checked={!!value}
            onChange={(checked) => handleChange(name, checked)}
            disabled={disabled}
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Number
    if (uiType === 'number' || dataType === 'int' || dataType === 'integer' || dataType === 'float' || dataType === 'double' || dataType === 'number') {
      return (
        <div key={name} className="space-y-1">
          <Input
            label={label}
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = dataType === 'int' || dataType === 'integer' 
                ? parseInt(e.target.value) 
                : parseFloat(e.target.value);
              handleChange(name, isNaN(val) ? e.target.value : val);
            }}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            min={validation?.min_value}
            max={validation?.max_value}
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Code Editor
    if (uiType === 'code_editor' || dataType === 'code') {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={value ?? ''}
            onChange={(e) => handleChange(name, e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "w-full h-48 text-xs p-3 font-mono border rounded-md bg-slate-950 text-green-400 outline-none resize-y transition-all",
              disabled 
                ? 'opacity-60 cursor-not-allowed' 
                : 'border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
            )}
            spellCheck={false}
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // JSON Editor
    if (uiType === 'json_editor') {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <JsonEditor 
            value={value} 
            onChange={(v) => handleChange(name, v)} 
            disabled={disabled}
            minHeight="150px"
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Key-Value Editor
    if (uiType === 'key_value' || (dataType === 'object' && !uiType)) {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <KeyValueMapEditor 
            value={value || {}} 
            onChange={(v) => handleChange(name, v)} 
            disabled={disabled} 
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Textarea
    if (uiType === 'textarea') {
      return (
        <div key={name} className="space-y-1">
          <Textarea
            label={label}
            value={value ?? ''}
            onChange={(e) => handleChange(name, e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Expression input (with special styling)
    if (uiType === 'expression' || dataType === 'expression') {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => handleChange(name, e.target.value)}
              disabled={disabled}
              placeholder={placeholder || '={{ $P.value }}'}
              className={cn(
                "w-full px-3 py-2 text-xs border rounded-md bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 font-mono",
                "focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500",
                disabled && "opacity-60 cursor-not-allowed",
                "border-amber-200 dark:border-amber-800"
              )}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
              EXPR
            </span>
          </div>
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Array type
    if (dataType === 'array') {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <JsonEditor 
            value={value || []} 
            onChange={(v) => handleChange(name, v)} 
            disabled={disabled} 
          />
          {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
          {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Legacy: String with options
    if (!isNewParameterDef(def) && def.type === 'string' && def.options) {
      return (
        <div key={name} className="space-y-1">
          <Select
            label={label}
            options={def.options.map(opt => ({ label: opt, value: opt }))}
            value={value ?? ''}
            onChange={(e) => handleChange(name, e.target.value)}
            disabled={disabled}
          />
          {description && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      );
    }

    // Default: Text input
    return (
      <div key={name} className="space-y-1">
        <Input
          label={label}
          type={dataType === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => handleChange(name, e.target.value)}
          disabled={disabled}
          placeholder={placeholder || (defaultValue ? String(defaultValue) : '')}
          required={required}
          minLength={validation?.min_length}
          maxLength={validation?.max_length}
          pattern={validation?.pattern}
        />
        {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{hint}</p>}
        {description && !hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
    );
  };

  const renderGroup = (groupName: string, params: (PluginParameterDefinition | ParameterDefinition)[]) => {
    if (params.length === 0) return null;
    
    const isExpanded = expandedGroups[groupName] ?? (groupName === 'basic');
    const displayName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    
    // Filter visible params
    const visibleParams = params.filter(def => {
      if (isNewParameterDef(def) && def.show_when) {
        return evaluateShowWhen(def.show_when, data);
      }
      return true;
    });
    
    if (visibleParams.length === 0) return null;

    return (
      <div key={groupName} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleGroup(groupName)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
            groupName === 'advanced' 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          )}
        >
          <span className="flex items-center gap-2">
            {displayName}
            <span className="text-[10px] font-normal text-slate-400">({visibleParams.length})</span>
          </span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        {isExpanded && (
          <div className="p-4 space-y-4 bg-white dark:bg-slate-900/50">
            {params.map(renderField)}
          </div>
        )}
      </div>
    );
  };

  // Check if we have any grouped params (new format)
  const hasGroups = Object.keys(groupedParams).some(
    group => group !== 'basic' && groupedParams[group].length > 0
  );

  if (!hasGroups) {
    // Simple flat list for legacy format or single group
    return (
      <div className="flex flex-col gap-4">
        {paramDefs.map(renderField)}
      </div>
    );
  }

  // Grouped display for new format
  return (
    <div className="flex flex-col gap-3">
      {renderGroup('basic', groupedParams.basic)}
      {renderGroup('advanced', groupedParams.advanced)}
      {Object.keys(groupedParams)
        .filter(g => g !== 'basic' && g !== 'advanced')
        .map(g => renderGroup(g, groupedParams[g]))}
    </div>
  );
};
