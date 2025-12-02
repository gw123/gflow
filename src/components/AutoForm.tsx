
import React from 'react';
import { PluginParameterDefinition } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';
import { JsonEditor } from './ui/Editors';

interface AutoFormProps {
  data: any;
  paramDefs: PluginParameterDefinition[];
  onChange: (newData: any) => void;
  disabled?: boolean;
}

export const AutoForm: React.FC<AutoFormProps> = ({ data, paramDefs, onChange, disabled }) => {
  
  const handleChange = (key: string, val: any) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <div className="flex flex-col gap-4">
      {paramDefs.map((def) => {
        const value = data[def.name] ?? def.defaultValue;
        
        return (
          <div key={def.name} className="group relative">
            
            {/* Boolean -> Switch */}
            {(def.type === 'bool' || def.type === 'boolean') ? (
              <Switch
                label={def.name}
                checked={!!value}
                onChange={(checked) => handleChange(def.name, checked)}
                disabled={disabled}
              />
            ) : 
            
            /* Number -> Input[type=number] */
            (def.type === 'int' || def.type === 'integer' || def.type === 'float' || def.type === 'double' || def.type === 'number') ? (
              <Input
                label={def.name}
                type="number"
                value={value}
                onChange={(e) => {
                  const val = def.type.includes('int') ? parseInt(e.target.value) : parseFloat(e.target.value);
                  handleChange(def.name, isNaN(val) ? e.target.value : val);
                }}
                disabled={disabled}
                helperText={def.description}
                required={def.required}
              />
            ) : 
            
            /* String with Options -> Select */
            (def.type === 'string' && def.options) ? (
              <Select
                label={def.name}
                options={def.options.map(opt => ({ label: opt, value: opt }))}
                value={value}
                onChange={(e) => handleChange(def.name, e.target.value)}
                disabled={disabled}
              />
            ) : 
            
            /* Object/Array -> JsonEditor */
            (def.type === 'object' || def.type === 'array') ? (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {def.name} {def.required && <span className="text-red-500">*</span>}
                </label>
                <JsonEditor 
                  value={value} 
                  onChange={(v) => handleChange(def.name, v)} 
                  disabled={disabled} 
                />
                {def.description && <p className="text-[10px] text-slate-500 dark:text-slate-400">{def.description}</p>}
              </div>
            ) : 
            
            /* Default String -> Input */
            (
              <Input
                label={def.name}
                type="text"
                value={value}
                onChange={(e) => handleChange(def.name, e.target.value)}
                disabled={disabled}
                placeholder={def.defaultValue ? String(def.defaultValue) : ''}
                helperText={def.description}
                required={def.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
