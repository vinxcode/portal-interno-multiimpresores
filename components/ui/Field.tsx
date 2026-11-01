'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-brand-dark">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-brand-muted">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const baseControlClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-slate-400 focus:border-brand-cobalt focus:outline-none focus:ring-1 focus:ring-brand-cobalt disabled:bg-brand-surface disabled:text-brand-muted';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref
) {
  return <input ref={ref} className={`${baseControlClass} ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select ref={ref} className={`${baseControlClass} ${className}`} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`${baseControlClass} min-h-20 ${className}`} {...props} />;
  }
);
