'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { listTemplates, type IndustryKey } from '@/lib/industry-templates';

/**
 * Empty-state hero shown on the dashboard for tenants with zero ops
 * data. Lets them one-click seed a usable starter catalogue so they
 * stop seeing "0 of everything" and have something to plan against.
 *
 * Disappears as soon as the tenant has any product or material — the
 * /api/onboarding/apply-template route enforces the same guard.
 */
export function TemplateQuickStart() {
  const router = useRouter();
  const templates = listTemplates();
  const [picked, setPicked] = useState<IndustryKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apply = (industry: IndustryKey) => {
    setPicked(industry);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/onboarding/apply-template', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ industry }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || body.success === false) {
          setError(body.error || 'Could not apply template');
          setPicked(null);
          return;
        }
        // Drop them on /materials so they can see the seeded data right away.
        router.replace('/materials');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        setPicked(null);
      }
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 via-white to-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Sparkles size={18} />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">Start with a template</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Pick an industry and we'll seed a sample product, recipe, and 5 raw materials so you can see the system work before typing your own catalogue.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((t) => {
          const isActive = picked === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => apply(t.key)}
              disabled={isPending}
              className={
                'flex h-full flex-col items-start gap-1 rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-60 ' +
                (isActive ? 'border-brand-500 ring-1 ring-brand-500' : 'border-border')
              }
            >
              <span className="text-2xl leading-none">{t.emoji}</span>
              <span className="text-sm font-semibold text-ink">{t.label}</span>
              <span className="text-xs text-slate-500">{t.description}</span>
              {isActive && isPending ? (
                <span className="mt-1 text-[11px] font-semibold text-brand-600">
                  Seeding…
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">
          You can edit or delete the demo rows any time. Templates only seed when your catalogue is empty.
        </p>
      )}
    </section>
  );
}
