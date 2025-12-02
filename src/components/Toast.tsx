import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900'
  };

  const textColors = {
    success: 'text-green-800 dark:text-green-300',
    error: 'text-red-800 dark:text-red-300',
    info: 'text-blue-800 dark:text-blue-300'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-5 fade-in ${bgColors[type]} max-w-md`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className={`text-sm font-medium ${textColors[type]}`}>
        {message}
      </div>
      <button 
        onClick={onClose}
        className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${textColors[type]}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;