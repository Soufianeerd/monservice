import React, { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hideLabel?: boolean;
  options?: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, id, hideLabel, options, children, ...props }, ref) => {
    const selectId = id || props.name || Math.random().toString(36).substring(7);
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId} 
            className={`block text-sm font-medium text-gray-700 mb-1 ${hideLabel ? 'sr-only' : ''}`}
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm px-4 py-2 border ${
            error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="mt-2 text-sm text-red-600" id={errorId}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
