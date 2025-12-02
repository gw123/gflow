
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, X, ChevronUp, ChevronDown, Settings, Check } from 'lucide-react';
import { InputFieldDefinition } from '../../types';

interface FormBuilderProps {
  fields: InputFieldDefinition[];
  onChange: (fields: InputFieldDefinition[]) => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ fields = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<InputFieldDefinition | null>(null);

  const handleAdd = () => {
    const newField: InputFieldDefinition = {
      key: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'string',
      required: true
    };
    onChange([...fields, newField]);
    setEditingIndex(fields.length);
    setEditData(newField);
  };

  const handleDelete = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditData(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newFields = [...fields];
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
      onChange(newFields);
    } else if (direction === 'down' && index < fields.length - 1) {
      const newFields = [...fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      onChange(newFields);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...fields[index] });
  };

  const saveEdit = () => {
    if (editData !== null && editingIndex !== null) {
      const newFields = [...fields];
      newFields[editingIndex] = editData;
      onChange(newFields);
      setEditingIndex(null);
      setEditData(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  const updateEditData = (key: keyof InputFieldDefinition, value: any) => {
    if (editData) {
      setEditData({ ...editData, [key]: value });
    }
  };

  const inputTypes = ['string', 'text', 'number', 'boolean', 'select', 'password', 'email', 'date'];

  return (
    <div className="space-y-4">
      {/* List View */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div 
            key={index} 
            className={`border rounded-md transition-all ${editingIndex === index ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                   <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30"><ChevronUp size={12}/></button>
                   <button onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1} className="hover:text-blue-600 disabled:opacity-30"><ChevronDown size={12}/></button>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{field.label}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                     <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{field.key}</span>
                     <span className="uppercase">{field.type}</span>
                     {field.required && <span className="text-red-500">*Required</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                 <button onClick={() => startEdit(index)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                   <Edit2 size={14} />
                 </button>
                 <button onClick={() => handleDelete(index)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                   <Trash2 size={14} />
                 </button>
              </div>
            </div>
            
            {/* Edit Panel */}
            {editingIndex === index && editData && (
               <div className="p-3 border-t border-blue-100 dark:border-blue-900/50 bg-slate-50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Key</label>
                          <input 
                             type="text" 
                             value={editData.key} 
                             onChange={e => updateEditData('key', e.target.value)}
                             className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Label</label>
                          <input 
                             type="text" 
                             value={editData.label} 
                             onChange={e => updateEditData('label', e.target.value)}
                             className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                          <select 
                             value={editData.type} 
                             onChange={e => updateEditData('type', e.target.value)}
                             className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                          >
                             {inputTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={editData.required} 
                                onChange={e => updateEditData('required', e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              Required
                          </label>
                      </div>
                  </div>
                  
                  {/* Advanced options toggle or standard fields */}
                  <div className="space-y-3">
                      {editData.type === 'select' && (
                          <div>
                             <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Options (comma separated)</label>
                             <input 
                                type="text" 
                                value={editData.options?.join(',') || ''} 
                                onChange={e => updateEditData('options', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                                placeholder="Option 1, Option 2"
                             />
                          </div>
                      )}
                      
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description / Help Text</label>
                         <input 
                            type="text" 
                            value={editData.description || ''} 
                            onChange={e => updateEditData('description', e.target.value)}
                            className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                         />
                      </div>
                      
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Value</label>
                         <input 
                            type="text" 
                            value={editData.defaultValue || ''} 
                            onChange={e => updateEditData('defaultValue', e.target.value)}
                            className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                         />
                      </div>

                      {/* Validation & Style Section */}
                      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                              <Settings size={12} className="text-slate-400"/>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Advanced</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Validation Regex</label>
                                  <input 
                                    type="text" 
                                    value={editData.validationRegex || ''} 
                                    onChange={e => updateEditData('validationRegex', e.target.value)}
                                    className="w-full p-1.5 text-[10px] border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 font-mono"
                                    placeholder="^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Error Message</label>
                                  <input 
                                    type="text" 
                                    value={editData.validationMessage || ''} 
                                    onChange={e => updateEditData('validationMessage', e.target.value)}
                                    className="w-full p-1.5 text-[10px] border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600"
                                    placeholder="Invalid email format"
                                  />
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Custom Style (JSON)</label>
                              <textarea
                                rows={2}
                                value={editData.style ? JSON.stringify(editData.style) : ''} 
                                onChange={e => {
                                    try {
                                        const val = e.target.value ? JSON.parse(e.target.value) : undefined;
                                        updateEditData('style', val);
                                    } catch(err) {
                                        // Allow typing invalid json temporarily or handle error state?
                                        // For simplicity we just won't update if invalid or maybe store string and parse on save?
                                        // Here we assume valid JSON input for power users.
                                    }
                                }}
                                className="w-full p-1.5 text-[10px] border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 font-mono"
                                placeholder='{ "borderColor": "red", "backgroundColor": "#f0f0f0" }'
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                     <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded transition">Cancel</button>
                     <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition flex items-center gap-1">
                        <Check size={12} /> Done
                     </button>
                  </div>
               </div>
            )}
          </div>
        ))}
      </div>

      <button 
         onClick={handleAdd}
         className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2 text-xs font-bold"
      >
         <Plus size={14} /> Add Form Field
      </button>
    </div>
  );
};
