'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, CheckCircle2 } from 'lucide-react';

type ThemeOption = 'light' | 'dark' | 'system';

const THEMES: { id: ThemeOption; label: string; icon: typeof Sun; description: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, description: 'Always use the light theme' },
  { id: 'dark', label: 'Dark', icon: Moon, description: 'Always use the dark theme' },
  { id: 'system', label: 'System', icon: Monitor, description: 'Follow your device settings' },
];

export function AppearanceTab() {
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Read from localStorage if available
    try {
      const stored = window.localStorage?.getItem?.('cashtraka-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setTheme(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  function selectTheme(t: ThemeOption) {
    setTheme(t);
    try {
      window.localStorage?.setItem?.('cashtraka-theme', t);
    } catch {
      // localStorage not available
    }

    // Apply theme class
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-bold text-slate-900">Appearance</h2>
        <p className="text-sm text-slate-500">Choose how CashTraka looks for you.</p>
      </div>

      <div className="p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Theme</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id)}
                className={
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ' +
                  (active
                    ? 'border-success-500 bg-success-50 text-success-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50')
                }
              >
                <Icon size={24} />
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-slate-500">{t.description}</span>
              </button>
            );
          })}
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
            <CheckCircle2 size={15} />
            Theme updated.
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Note: Dark mode support is coming soon. Currently the app uses the light theme.
        </p>
      </div>
    </div>
  );
}
