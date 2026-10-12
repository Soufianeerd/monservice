'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeSwitcher() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // La préférence est rendue côté serveur pour éviter un flash au rechargement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  function toggle() {
    const theme = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.cookie = `monservice_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    setDark(!dark);
  }

  return (
    <button type="button" onClick={toggle} aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'} aria-pressed={dark}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 p-2 text-sm text-gray-700 hover:bg-gray-50">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden xl:inline">{dark ? 'Clair' : 'Sombre'}</span>
    </button>
  );
}
