
import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, Key, Search, AlertCircle, Loader2, Eye, EyeOff, Copy } from 'lucide-react';
import { CredentialItem } from '../types';
import { CREDENTIAL_DEFINITIONS, CredentialDefinition } from '../credential_definitions';

interface SecretsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: CredentialItem[];
  onSave: (updatedCredentials: CredentialItem[]) => void;
  onCredentialUpdate: (item: CredentialItem) => void;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  
  // New props for async handling
  isServerMode?: boolean;
  onServerCreate?: (secret: CredentialItem) => Promise<CredentialItem | void>;
  onServerUpdate?: (secret: CredentialItem) => Promise<CredentialItem | void>;
  onServerDelete?: (id: string) => Promise<void>;
}

const SecretsManager: React.FC<SecretsManagerProps> = ({ 
  isOpen, onClose, credentials, onSave, onCredentialUpdate, notify,
  isServerMode = false, onServerCreate, onServerUpdate, onServerDelete
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(CREDENTIAL_DEFINITIONS[0]?.name || '');
  const [formData, setFormData] = useState<any>({});
  const [formName, setFormName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Prepare list of filtered credentials
  const filteredCredentials = credentials.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (cred: CredentialItem) => {
    setEditingId(cred.id);
    setFormName(cred.name);
    setSelectedType(cred.type);
    setFormData(JSON.parse(JSON.stringify(cred.data)));
    setErrors({});
    setVisibleFields({});
  };

  const handleCreate = () => {
    setEditingId('new');
    setFormName('');
    const defaultType = CREDENTIAL_DEFINITIONS[0]?.name || '';
    setSelectedType(defaultType);
    initFormData(defaultType);
    setErrors({});
    setVisibleFields({});
  };

  const initFormData = (typeName: string) => {
    const def = CREDENTIAL_DEFINITIONS.find(d => d.name === typeName);
    if (def) {
      setFormData(JSON.parse(JSON.stringify(def.value)));
    } else {
      setFormData({});
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setSelectedType(newType);
    initFormData(newType);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this secret? Linked nodes will lose their connection.")) {
      if (isServerMode && onServerDelete) {
         try {
             setIsSaving(true);
             await onServerDelete(id);
             if (editingId === id) setEditingId(null);
             notify("Secret deleted successfully", "success");
         } catch(e) {
             notify("Failed to delete secret", "error");
         } finally {
             setIsSaving(false);
         }
      } else {
        const updated = credentials.filter(c => c.id !== id);
        onSave(updated);
        if (editingId === id) {
            setEditingId(null);
        }
        notify("Secret deleted successfully", "success");
      }
    }
  };

  const validateForm = (def: CredentialDefinition, data: any) => {
    const newErrors: Record<string, string> = {};
    if (!formName.trim()) {
      newErrors['_name'] = "Name is required";
    }

    if (def.validation) {
      Object.entries(def.validation).forEach(([field, pattern]) => {
        const val = data[field];
        if (val !== undefined && val !== null) {
           try {
             const regex = new RegExp(pattern);
             if (!regex.test(String(val))) {
               newErrors[field] = "Invalid format";
             }
           } catch (e) {
             // Ignore bad regex
           }
        }
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveForm = async () => {
    const def = CREDENTIAL_DEFINITIONS.find(d => d.name === selectedType);
    if (!def) {
        notify("Invalid credential type", "error");
        return;
    }

    if (!validateForm(def, formData)) {
        notify("Please fix validation errors", "error");
        return;
    }

    const newItem: CredentialItem = {
      id: editingId === 'new' ? Math.random().toString(36).substring(2, 15) : editingId!,
      name: formName,
      type: selectedType,
      data: formData
    };

    if (isServerMode) {
        setIsSaving(true);
        try {
            let savedItem = newItem;
            if (editingId === 'new' && onServerCreate) {
                const result = await onServerCreate(newItem);
                if (result) savedItem = result;
                notify("Secret created successfully", "success");
            } else if (onServerUpdate) {
                const result = await onServerUpdate(newItem);
                if (result) savedItem = result;
                notify("Secret updated successfully", "success");
            }
            onCredentialUpdate(savedItem);
            setEditingId(null);
        } catch (e: any) {
            console.error("Secret save error:", e);
            notify(`Failed to save secret: ${e.message || 'Unknown error'}`, "error");
        } finally {
            setIsSaving(false);
        }
    } else {
        // Legacy local mode
        if (editingId === 'new') {
            onSave([...credentials, newItem]);
            notify("Secret created successfully", "success");
        } else {
            const updated = credentials.map(c => c.id === editingId ? newItem : c);
            onSave(updated);
            onCredentialUpdate(newItem);
            notify("Secret updated successfully", "success");
        }
        setEditingId(null);
    }
  };

  const toggleVisibility = (key: string) => {
      setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      notify("Copied to clipboard", "success");
  };

  const renderField = (key: string, value: any) => {
    const isBoolean = typeof value === 'boolean';
    const isObject = typeof value === 'object' && value !== null;
    const isSensitive = /password|secret|key|token|auth|credential/i.test(key);
    const isVisible = visibleFields[key];
    
    return (
      <div key={key} className="mb-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase mb-1">
          {key.replace(/_/g, ' ')}
        </label>
        {isBoolean ? (
          <select 
            value={value ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, [key]: e.target.value === 'true' })}
            className="w-full p-2 text-sm border rounded bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-gray-600 outline-none focus:border-blue-500"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : isObject ? (
           <textarea
             value={JSON.stringify(value, null, 2)}
             onChange={(e) => {
                try {
                   const parsed = JSON.parse(e.target.value);
                   setFormData({ ...formData, [key]: parsed });
                   const newErrs = {...errors};
                   delete newErrs[key];
                   setErrors(newErrs);
                } catch(err) {}
             }}
             className="w-full p-2 text-xs font-mono border rounded bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-gray-600 outline-none focus:border-blue-500 h-24"
           />
        ) : (
          <div className="relative">
            <input 
              type={isSensitive && !isVisible ? "password" : "text"}
              value={value}
              onChange={(e) => {
                 setFormData({ ...formData, [key]: e.target.value });
                 const newErrs = {...errors};
                 delete newErrs[key];
                 setErrors(newErrs);
              }}
              className={`w-full p-2 text-sm border rounded bg-gray-50 dark:bg-slate-700 outline-none focus:ring-1 pr-16 ${errors[key] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-500'}`}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1 text-gray-400">
                {isSensitive && (
                    <button onClick={() => toggleVisibility(key)} type="button" className="hover:text-blue-500">
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
                <button onClick={() => copyToClipboard(String(value))} type="button" className="hover:text-blue-500" title="Copy value">
                    <Copy size={14} />
                </button>
            </div>
            
            {errors[key] && (
                <span className="text-[10px] text-red-500 absolute right-16 top-2.5 flex items-center gap-1">
                    <AlertCircle size={10} /> {errors[key]}
                </span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-xl shadow-2xl flex h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-slate-50 dark:bg-slate-900">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Key size={18} className="text-blue-500"/> Secrets Manager
                {isServerMode ? (
                    <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">Cloud</span>
                ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">Local</span>
                )}
              </h3>
              <button 
                onClick={handleCreate}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                title="Add New Secret"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search secrets..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredCredentials.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">No secrets found</div>
            ) : (
                filteredCredentials.map(cred => (
                    <div 
                        key={cred.id}
                        onClick={() => handleEdit(cred)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                            editingId === cred.id 
                            ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{cred.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5 bg-gray-100 dark:bg-slate-700 inline-block px-1.5 py-0.5 rounded">
                                    {cred.type}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(cred.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                                disabled={isSaving}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
           <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                  {editingId === 'new' ? 'Create New Secret' : editingId ? 'Edit Secret' : 'Select a secret to edit'}
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
           </div>
           {editingId ? (
               <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Secret Name</label>
                              <input 
                                type="text" 
                                value={formName}
                                onChange={(e) => {
                                    setFormName(e.target.value);
                                    const newErrs = {...errors};
                                    delete newErrs['_name'];
                                    setErrors(newErrs);
                                }}
                                placeholder="e.g. My Production DB"
                                className={`w-full p-2 text-sm border rounded bg-gray-50 dark:bg-slate-900 outline-none focus:ring-2 ${errors['_name'] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                              />
                              {errors['_name'] && <span className="text-xs text-red-500 mt-1 block">{errors['_name']}</span>}
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Type</label>
                              <select 
                                value={selectedType}
                                onChange={handleTypeChange}
                                disabled={editingId !== 'new'}
                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                {CREDENTIAL_DEFINITIONS.map(def => (
                                    <option key={def.name} value={def.name}>{def.name} ({def.type})</option>
                                ))}
                              </select>
                          </div>
                      </div>
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>
                      <div>
                          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                              <Edit2 size={14} /> Configuration Values
                          </h4>
                          <div className="grid grid-cols-1 gap-y-1">
                              {Object.entries(formData).map(([key, val]) => renderField(key, val))}
                          </div>
                      </div>
                  </div>
               </div>
           ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                   <Key size={64} className="mb-4 opacity-20"/>
                   <p>Select a secret from the list or create a new one.</p>
               </div>
           )}
           {editingId && (
               <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
                   <button 
                     onClick={() => setEditingId(null)}
                     className="px-4 py-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition"
                     disabled={isSaving}
                   >
                       Cancel
                   </button>
                   <button 
                     onClick={handleSaveForm}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2 transition"
                     disabled={isSaving}
                   >
                       {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Secret
                   </button>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SecretsManager;
