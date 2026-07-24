import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, hideLabel, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className={`block text-sm font-medium text-gray-700 mb-1 ${hideLabel ? 'sr-only' : ''}`}
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm px-4 py-2 border ${
            error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" id={errorId}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
