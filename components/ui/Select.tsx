
import React, { SelectHTMLAttributes } from 'react';
import { cn } from './utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options: { label: string; value: string | number }[] | string[];
}

export const Select: React.FC<SelectProps> = ({ className, error, label, options, id, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={cn(
            "w-full px-3 py-2 text-xs border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-all appearance-none",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            error 
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" 
              : "border-slate-300 dark:border-slate-600",
            props.disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50",
            className
          )}
          {...props}
        >
          {options.map((opt, idx) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const value = typeof opt === 'string' ? opt : opt.value;
            return <option key={idx} value={value}>{label}</option>;
          })}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={14} />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
