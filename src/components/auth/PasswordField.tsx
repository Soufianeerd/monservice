'use client';

import { useId, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/validation/schemas';

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Affiche les règles une seule fois, sous le champ, cochées au fil de la saisie. */
  showRequirements?: boolean;
}

export default function PasswordField({ label = 'Mot de passe', error, helperText, showRequirements = false, className = '', id, value, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = `${inputId}-description`;
  const current = typeof value === 'string' ? value : '';

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5 transition-colors group-focus-within:text-primary-600">
        {label}
      </label>
      <div className="relative group">
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          // Jamais de correction ni de suggestion du clavier, même en clair.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText || showRequirements ? describedBy : undefined}
          className={`block w-full appearance-none rounded-xl border ${error ? 'border-red-300' : 'border-gray-200'} bg-gray-50/50 px-4 py-3 placeholder-gray-400 shadow-sm transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 sm:text-sm pr-10`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-controls={inputId}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          )}
        </button>
      </div>
      <div id={describedBy}>
        {error && <p className="mt-1.5 text-sm text-red-600 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
        {showRequirements && (
          <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2" aria-label="Règles du mot de passe">
            {PASSWORD_REQUIREMENTS.map((requirement) => {
              const met = requirement.test(current);
              return (
                <li key={requirement.id} className={`flex items-center gap-1.5 ${met ? 'text-emerald-700' : 'text-gray-500'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${met ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`} aria-hidden="true">
                    {met && <Check className="h-3 w-3" />}
                  </span>
                  {requirement.label}
                  <span className="sr-only">{met ? ' : respecté' : ' : manquant'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
