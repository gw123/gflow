
import React from 'react';
import { cn } from './utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, label, className }) => {
  return (
    <div className={cn("flex items-center h-9", className)}>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
      {label && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>}
    </div>
  );
};
