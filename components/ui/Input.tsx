
import React, { InputHTMLAttributes } from 'react';
import { cn } from './utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ className, error, label, helperText, id, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full px-3 py-2 text-xs border rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400",
          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          error 
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" 
            : "border-slate-300 dark:border-slate-600",
          props.disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
};
