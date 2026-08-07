'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function PasswordField({ label = 'Mot de passe', error, className = '', id, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5 transition-colors group-focus-within:text-primary-600">
        {label}
      </label>
      <div className="relative group">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`block w-full appearance-none rounded-xl border ${error ? 'border-red-300' : 'border-gray-200'} bg-gray-50/50 px-4 py-3 placeholder-gray-400 shadow-sm transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 sm:text-sm pr-10`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
}
