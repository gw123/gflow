
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Play, Clock, Globe, Code, List, Loader2, Send, Search, FileText, AlertCircle, Check, AlignLeft } from 'lucide-react';
import { api, ApiRequest } from '../api/client';

interface ApiManagerProps {
  isOpen: boolean;
  onClose: () => void;
  notify: (msg: string, type: 'success'|'error'|'info') => void;
}

const KeyValueEditor: React.FC<{ 
  items: { key: string, value: string, enabled: boolean }[]; 
  onChange: (items: { key: string, value: string, enabled: boolean }[]) => void;
}> = ({ items, onChange }) => {
  const handleChange = (index: number, field: 'key'|'value', val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    onChange(newItems);
  };

  const handleToggle = (index: number) => {
    const newItems = [...items];
    newItems[index].enabled = !newItems[index].enabled;
    onChange(newItems);
  };

  const handleDelete = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="w-full h-full flex flex-col">
        {/* Header Row */}
        {items.length > 0 && (
            <div className="flex gap-2 px-1 mb-2 items-center">
                <div className="w-5 flex-shrink-0" /> {/* Checkbox spacer */}
                <div className="flex-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Key</div>
                <div className="flex-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Value</div>
                <div className="w-7 flex-shrink-0" /> {/* Delete button spacer */}
            </div>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
            {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                    <div className="w-5 flex-shrink-0 flex justify-center">
                        <input 
                            type="checkbox" 
                            checked={item.enabled} 
                            onChange={() => handleToggle(idx)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title={item.enabled ? "Disable" : "Enable"}
                        />
                    </div>
                    <input
                        value={item.key}
                        onChange={(e) => handleChange(idx, 'key', e.target.value)}
                        placeholder="Key"
                        className={`flex-1 min-w-0 text-xs px-3 py-2 border rounded-md outline-none transition-all ${
                            !item.enabled ? 'opacity-50 bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                        } border-slate-200 dark:border-slate-700`}
                    />
                    <input
                        value={item.value}
                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className={`flex-1 min-w-0 text-xs px-3 py-2 border rounded-md outline-none transition-all ${
                            !item.enabled ? 'opacity-50 bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                        } border-slate-200 dark:border-slate-700`}
                    />
                    <div className="w-7 flex-shrink-0 flex justify-center">
                        <button 
                            onClick={() => handleDelete(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete parameter"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
        
        <button 
            onClick={handleAdd}
            className="mt-3 w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-1.5 font-medium"
        >
            <Plus size={14} /> Add Parameter
        </button>
    </div>
  );
};

const ApiManager: React.FC<ApiManagerProps> = ({ isOpen, onClose, notify }) => {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editor State
  const [currentReq, setCurrentReq] = useState<ApiRequest>({
      id: 'new',
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      body: ''
  });
  const [requestTab, setRequestTab] = useState<'params'|'headers'|'body'>('params');
  const [responseTab, setResponseTab] = useState<'body'|'headers'>('body');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    if (isOpen) loadRequests();
  }, [isOpen]);

  useEffect(() => {
      if (selectedId && selectedId !== 'new') {
          const found = requests.find(r => r.id === selectedId);
          if (found) {
              setCurrentReq(JSON.parse(JSON.stringify(found))); // Deep copy
              setResponse(null);
          }
      } 
  }, [selectedId, requests]);

  const loadRequests = async () => {
      setLoadingList(true);
      try {
          const list = await api.getApis();
          setRequests(list);
          if (list.length > 0 && !selectedId) {
              setSelectedId(list[0].id);
          } else if (list.length === 0) {
              handleCreateNew();
          }
      } catch(e) {
          notify("Failed to load APIs", "error");
      } finally {
          setLoadingList(false);
      }
  };

  const handleCreateNew = () => {
      setSelectedId('new');
      setCurrentReq({
          id: 'new',
          name: 'New Request',
          method: 'GET',
          url: '',
          headers: [],
          params: [],
          body: ''
      });
      setResponse(null);
      setRequestTab('params');
  };

  const handleSave = async () => {
      if (!currentReq.url) {
          notify("URL is required", "error");
          return;
      }
      setIsSaving(true);
      try {
          const toSave = { ...currentReq, id: currentReq.id === 'new' ? undefined : currentReq.id } as ApiRequest;
          const saved = await api.saveApi(toSave);
          
          setRequests(prev => {
              const exists = prev.find(r => r.id === saved.id);
              if (exists) return prev.map(r => r.id === saved.id ? saved : r);
              return [...prev, saved];
          });
          setSelectedId(saved.id);
          setCurrentReq(saved);
          notify("Request saved", "success");
      } catch(e) {
          notify("Failed to save request", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Delete this request?")) return;
      try {
          await api.deleteApi(id);
          setRequests(prev => prev.filter(r => r.id !== id));
          if (selectedId === id) handleCreateNew();
          notify("Request deleted", "success");
      } catch(e) {
          notify("Failed to delete request", "error");
      }
  };

  const handleSend = async () => {
      if (!currentReq.url) {
          notify("Enter a URL first", "error");
          return;
      }
      setIsRunning(true);
      setResponse(null);
      setResponseTab('body'); // Reset to body view on new request
      const startTime = Date.now();

      try {
          // Prepare data
          const headersObj = currentReq.headers.reduce((acc, item) => {
              if(item.enabled && item.key) acc[item.key] = item.value;
              return acc;
          }, {} as any);
          
          const paramsObj = currentReq.params.reduce((acc, item) => {
              if(item.enabled && item.key) acc[item.key] = item.value;
              return acc;
          }, {} as any);

          // Parse Body if JSON
          let bodyData = currentReq.body;
          if (bodyData && headersObj['Content-Type']?.includes('application/json')) {
              try {
                  bodyData = JSON.parse(bodyData);
              } catch(e) {
                  // Send as string if parse fails
              }
          }

          const res = await api.proxyRequest(currentReq.method, currentReq.url, headersObj, bodyData, paramsObj);
          
          const endTime = Date.now();
          setResponse({
              ...res,
              time: endTime - startTime
          });

      } catch(e: any) {
          setResponse({
              status: 0,
              statusText: "Network Error",
              error: e.message || "Failed to reach server",
              time: Date.now() - startTime
          });
      } finally {
          setIsRunning(false);
      }
  };

  const formatBody = () => {
      try {
          const parsed = JSON.parse(currentReq.body);
          setCurrentReq({ ...currentReq, body: JSON.stringify(parsed, null, 2) });
      } catch (e) {
          notify("Invalid JSON", "error");
      }
  };

  const getStatusColor = (status: number) => {
      if (status >= 200 && status < 300) return 'text-green-700 bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      if (status >= 300 && status < 400) return 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      if (status >= 400 && status < 500) return 'text-orange-700 bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      if (status >= 500) return 'text-red-700 bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      return 'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const filteredRequests = requests.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Top Bar */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-md text-white">
                    <Globe size={18} />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">API Manager</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 flex flex-col">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={handleCreateNew}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium transition-colors mb-3"
                    >
                        <Plus size={16} /> New Request
                    </button>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Filter APIs..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs border rounded-md bg-white dark:bg-slate-800 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingList && requests.length === 0 ? (
                        <div className="flex justify-center p-4">
                            <Loader2 size={20} className="animate-spin text-slate-400"/>
                        </div>
                    ) : (
                        filteredRequests.map(req => (
                            <div 
                                key={req.id}
                                onClick={() => setSelectedId(req.id)}
                                className={`p-2.5 rounded-md cursor-pointer flex items-center justify-between group transition-all ${selectedId === req.id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}`}
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-xs font-semibold truncate ${selectedId === req.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{req.name}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[9px] font-bold px-1 rounded ${
                                            req.method === 'GET' ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 
                                            req.method === 'POST' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' :
                                            req.method === 'DELETE' ? 'text-red-600 bg-red-100 dark:bg-red-900/30' :
                                            'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
                                        }`}>{req.method}</span>
                                        <span className="text-[9px] text-slate-400 truncate max-w-[100px]">{req.url}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(req.id, e)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                {/* Request Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={currentReq.name}
                            onChange={e => setCurrentReq({...currentReq, name: e.target.value})}
                            className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 transition-colors flex-1"
                            placeholder="Request Name"
                        />
                        <button 
                            onClick={handleSave}
                            className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} />} Save
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={currentReq.method}
                            onChange={e => setCurrentReq({...currentReq, method: e.target.value})}
                            className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input 
                            type="text"
                            value={currentReq.url}
                            onChange={e => setCurrentReq({...currentReq, url: e.target.value})}
                            placeholder="Enter request URL"
                            className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2.5 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700 dark:text-slate-300" 
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isRunning}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            {isRunning ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />} Send
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Request Config */}
                    <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700 min-w-0">
                        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900">
                            <button onClick={() => setRequestTab('params')} className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${requestTab === 'params' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Params</button>
                            <button onClick={() => setRequestTab('headers')} className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${requestTab === 'headers' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Headers</button>
                            <button onClick={() => setRequestTab('body')} className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${requestTab === 'body' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Body</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
                            {requestTab === 'params' && <KeyValueEditor items={currentReq.params} onChange={i => setCurrentReq({...currentReq, params: i})} />}
                            {requestTab === 'headers' && <KeyValueEditor items={currentReq.headers} onChange={i => setCurrentReq({...currentReq, headers: i})} />}
                            {requestTab === 'body' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between mb-2 items-center">
                                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">JSON / Raw Text</span>
                                        <button 
                                            onClick={formatBody}
                                            className="text-[10px] flex items-center gap-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-0.5 rounded transition-colors"
                                        >
                                            <AlignLeft size={10} /> Prettify
                                        </button>
                                    </div>
                                    <textarea 
                                        value={currentReq.body}
                                        onChange={e => setCurrentReq({...currentReq, body: e.target.value})}
                                        className="flex-1 w-full p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-950 font-mono text-xs outline-none focus:border-blue-500 resize-none"
                                        placeholder="{}"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Response */}
                    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Response</h3>
                            {response && (
                                <div className="flex items-center gap-3 text-[10px]">
                                    <span className={`font-bold px-1.5 py-0.5 rounded border ${getStatusColor(response.status)}`}>
                                        {response.status} {response.statusText}
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-500"><Clock size={10}/> {response.time}ms</span>
                                    {response.size && <span className="text-slate-500">{response.size} B</span>}
                                </div>
                            )}
                        </div>
                        
                        {/* Response Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <button onClick={() => setResponseTab('body')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide border-b-2 transition-colors ${responseTab === 'body' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Body</button>
                            <button onClick={() => setResponseTab('headers')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide border-b-2 transition-colors ${responseTab === 'headers' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Headers</button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 relative">
                            {!response && !isRunning && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <Play size={32} className="mb-2 opacity-20" />
                                    <span className="text-xs">Enter URL and click Send</span>
                                </div>
                            )}
                            {isRunning && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                                    <Loader2 size={32} className="animate-spin mb-2" />
                                    <span className="text-xs font-medium">Sending Request...</span>
                                </div>
                            )}
                            {response && (
                                <div className="h-full">
                                    {response.error ? (
                                        <div className="text-red-500 font-mono text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
                                            <div className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={14}/> Error Occurred</div>
                                            <div className="whitespace-pre-wrap break-all">{response.error}</div>
                                        </div>
                                    ) : (
                                        responseTab === 'body' ? (
                                            response.data !== undefined && response.data !== null ? (
                                                typeof response.data === 'object' ? (
                                                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all whitespace-pre-wrap">
                                                        {JSON.stringify(response.data, null, 2)}
                                                    </pre>
                                                ) : (
                                                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all whitespace-pre-wrap">
                                                        {String(response.data)}
                                                    </pre>
                                                )
                                            ) : (
                                                <div className="text-xs text-slate-400 italic">No response body returned.</div>
                                            )
                                        ) : (
                                            /* Headers View */
                                            response.headers ? (
                                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs font-mono">
                                                    {Object.entries(response.headers).map(([key, val]) => (
                                                        <React.Fragment key={key}>
                                                            <div className="text-slate-500 dark:text-slate-400 font-bold text-right">{key}:</div>
                                                            <div className="text-slate-700 dark:text-slate-200 break-all">{String(val)}</div>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            ) : <div className="text-xs text-slate-400 italic">No headers available.</div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ApiManager;
