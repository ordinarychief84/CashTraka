'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, CheckCircle2, AlertCircle, Package, Boxes, BookOpen } from 'lucide-react';

type PackPreview = {
  id: string;
  label: string;
  description: string;
  emoji?: string | null;
  materials: number;
  products: number;
  recipes: number;
};

/**
 * One-tap starter-pack loader. Renders inside the products / materials
 * empty state. On click → POST /api/onboarding/apply-vertical with the
 * given packId, shows inline status, then refreshes so the empty
 * state melts into the populated table.
 *
 * Idempotent server-side, so re-clicking after partial customisation is
 * safe — only missing pieces get added.
 */
export function StarterPackCta({ pack }: { pack: PackPreview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; created: { materials: number; products: number; recipes: number } }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  function onClick() {
    startTransition(async () => {
      setState({ kind: 'idle' });
      try {
        const res = await fetch('/api/onboarding/apply-vertical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: pack.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ kind: 'error', message: json?.error || 'Could not apply pack.' });
          return;
        }
        const data = json?.data;
        setState({
          kind: 'success',
          created: {
            materials: data?.materialsCreated ?? 0,
            products: data?.productsCreated ?? 0,
            recipes: data?.recipesCreated ?? 0,
          },
        });
        router.refresh();
      } catch (e) {
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Network error.',
        });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 shadow-xs">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-xs">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-800">
            {pack.emoji && <span className="mr-1.5">{pack.emoji}</span>}
            Start with the {pack.label} pack
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-700/80">{pack.description}</p>
        </div>
      </header>

      <ul className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <li className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2">
          <Boxes size={12} className="text-brand-700" />
          <span>
            <span className="num font-bold text-ink">{pack.materials}</span>
            <span className="ml-1 text-slate-500">materials</span>
          </span>
        </li>
        <li className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2">
          <Package size={12} className="text-brand-700" />
          <span>
            <span className="num font-bold text-ink">{pack.products}</span>
            <span className="ml-1 text-slate-500">products</span>
          </span>
        </li>
        <li className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2">
          <BookOpen size={12} className="text-brand-700" />
          <span>
            <span className="num font-bold text-ink">{pack.recipes}</span>
            <span className="ml-1 text-slate-500">recipes</span>
          </span>
        </li>
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-60"
      >
        <Sparkles size={14} />
        {pending ? 'Loading pack…' : 'Load the starter pack'}
      </button>

      {state.kind === 'success' && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-xs text-success-800">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">
              Loaded {state.created.products} products, {state.created.materials} materials, {state.created.recipes} recipes.
            </div>
            <p className="mt-0.5">
              <Link href="/recipes" className="underline">Edit recipes</Link>
              {' · '}
              <Link href="/materials" className="underline">Set stock levels</Link>
              {' · '}
              <Link href="/products" className="underline">Adjust prices</Link>
            </p>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500">
        You can edit every product, material, and recipe afterwards. Re-loading the pack is safe — only missing pieces get added.
      </p>
    </section>
  );
}
