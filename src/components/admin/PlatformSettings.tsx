'use client';

import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';

type PlatformSettingsProps = {
  initialSettings: Record<string, string>;
};

const SETTINGS_CONFIG = [
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    type: 'toggle' as const,
    description: 'Enable this to put the platform in maintenance mode',
  },
  {
    key: 'default_trial_days',
    label: 'Default Trial Days',
    type: 'number' as const,
    description: 'Number of days new users get for free trial',
    default: '14',
  },
  {
    key: 'max_free_customers',
    label: 'Max Free Customers',
    type: 'number' as const,
    description: 'Maximum number of customers free plan users can have',
    default: '20',
  },
  {
    key: 'support_email',
    label: 'Support Email',
    type: 'text' as const,
    description: 'Email address for customer support',
  },
  {
    key: 'platform_announcement',
    label: 'Platform Announcement',
    type: 'textarea' as const,
    description: 'Message shown as banner to all users (leave empty to hide)',
  },
];

export function PlatformSettings({ initialSettings }: PlatformSettingsProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Track if settings have changed from initial
  useEffect(() => {
    const changed = Object.entries(initialSettings).some(
      ([key, value]) => settings[key] !== value
    );
    setHasChanges(changed);
  }, [settings, initialSettings]);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSuccess(false);

    try {
      // Save each changed setting
      const changedKeys = Object.keys(settings).filter(
        (key) => settings[key] !== initialSettings[key]
      );

      for (const key of changedKeys) {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: settings[key] }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? `Failed to save ${key}`);
        }
      }

      setSuccess(true);
      setHasChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
        <Settings size={18} className="text-slate-400" />
        Platform Settings
      </h2>

      <p className="mb-6 text-sm text-slate-600">
        Configure platform-wide settings that affect all users
      </p>

      <div className="space-y-6">
        {SETTINGS_CONFIG.map((config) => (
          <div key={config.key}>
            <label className="mb-1 block">
              <span className="text-sm font-semibold text-slate-800">{config.label}</span>
              <p className="mt-0.5 text-xs text-slate-500">{config.description}</p>
            </label>

            {config.type === 'toggle' ? (
              <div className="mt-2 flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only h-4 w-4 cursor-pointer"
                    checked={settings[config.key] === 'true'}
                    onChange={(e) =>
                      handleChange(config.key, e.target.checked ? 'true' : 'false')
                    }
                    disabled={busy}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-success-400 peer-checked:after:translate-x-5 peer-disabled:opacity-50" />
                </label>
                <span className="text-sm text-slate-600">
                  {settings[config.key] === 'true' ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ) : config.type === 'textarea' ? (
              <textarea
                className="input min-h-[100px]"
                placeholder={config.label}
                value={settings[config.key] ?? ''}
                onChange={(e) => handleChange(config.key, e.target.value)}
                disabled={busy}
                maxLength={500}
              />
            ) : (
              <input
                type={config.type}
                className="input"
                placeholder={config.label}
                value={settings[config.key] ?? (config.default ?? '')}
                onChange={(e) => handleChange(config.key, e.target.value)}
                disabled={busy}
                {...(config.type === 'number' && { min: '0' })}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Settings saved successfully!
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !hasChanges}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          {busy ? 'Saving...' : 'Save Settings'}
        </button>
        {hasChanges && (
          <span className="flex items-center text-xs text-owed-600">
            You have unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
