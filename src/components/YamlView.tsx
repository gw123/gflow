
import React, { useState, useEffect } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import yaml from 'js-yaml';

interface YamlViewProps {
  yamlContent: string;
  onUpdate: (newYaml: string) => boolean;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
}

const YamlView: React.FC<YamlViewProps> = ({ yamlContent, onUpdate, notify }) => {
  const [content, setContent] = useState(yamlContent);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent(yamlContent);
    setError(null);
  }, [yamlContent]);

  const validateYaml = (value: string) => {
    try {
      yaml.load(value);
      setError(null);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    validateYaml(newVal);
  };

  const handleApply = () => {
    if (!validateYaml(content)) {
        notify("Please fix syntax errors before applying.", "error");
        return;
    }
    // The parent's update method might still fail on logical/schema errors even if syntax is valid
    const success = onUpdate(content);
    if (success) {
        setError(null);
    } else {
        // Usually parent notifies, but we can set error state too if needed
        setError("Failed to apply YAML. Check logical structure.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    notify("Copied to clipboard", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-gray-100">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold text-blue-400">workflow.yaml</h3>
            {error && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-red-400 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50">
                    <AlertTriangle size={10} /> Syntax Error
                </span>
            )}
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={handleApply}
                disabled={!!error}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    error 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
            >
                Apply Changes
            </button>
            <button
                onClick={copyToClipboard}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition"
                title="Copy"
            >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
        </div>
      </div>
      <div className="flex-1 relative">
        <textarea
          value={content}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full p-4 bg-slate-900 text-gray-300 font-mono text-sm outline-none resize-none scrollbar-thin scrollbar-thumb-slate-700"
          spellCheck={false}
        />
      </div>
      {error && (
        <div className="p-3 bg-red-950/40 text-red-200 text-xs border-t border-red-900/50 font-mono whitespace-pre-wrap animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default YamlView;
