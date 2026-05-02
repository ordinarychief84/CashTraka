'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  Target,
  Gift,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';

type Suggestion = {
  id: string;
  type: 'COLLECT' | 'REWARD' | 'RE_ENGAGE' | 'OPTIMISE';
  priority: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  customerName?: string;
  amount?: number;
};

const TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  COLLECT: { icon: Target, color: 'text-red-600', bg: 'bg-red-50' },
  REWARD: { icon: Gift, color: 'text-success-600', bg: 'bg-success-50' },
  RE_ENGAGE: { icon: RefreshCw, color: 'text-brand-600', bg: 'bg-brand-50' },
  OPTIMISE: { icon: Settings, color: 'text-purple-600', bg: 'bg-purple-50' },
};

export function SuggestionsPanel({ isPaid }: { isPaid: boolean }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!isPaid) {
      setLoading(false);
      return;
    }
    fetch('/api/suggestions')
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPaid]);

  if (!isPaid) {
    return (
      <div className="rounded-xl border bg-gradient-to-r from-owed-50 to-owed-50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className="text-owed-600" />
          <h3 className="text-sm font-semibold text-slate-800">Smart Suggestions</h3>
          <Lock size={14} className="text-owed-500" />
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Upgrade to get AI-powered suggestions on who to chase, who to reward, and how to improve your collections.
        </p>
        <Link
          href="/settings?tab=billing"
          className="inline-flex items-center gap-1 rounded-lg bg-owed-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-owed-700"
        >
          Upgrade <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-40 mb-3"></div>
        <div className="space-y-2">
          <div className="h-12 bg-slate-100 rounded"></div>
          <div className="h-12 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className="text-success-600" />
          <h3 className="text-sm font-semibold text-slate-800">Smart Suggestions</h3>
        </div>
        <p className="text-xs text-slate-500">
          No suggestions right now, your collections look great!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-owed-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Smart Suggestions ({suggestions.length})
          </h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t divide-y">
          {suggestions.slice(0, 5).map((s) => {
            const config = TYPE_CONFIG[s.type] || TYPE_CONFIG.OPTIMISE;
            const Icon = config.icon;

            return (
              <div key={s.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  <Icon size={14} className={config.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">{s.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{s.body}</p>
                </div>
                <Link
                  href={s.actionHref}
                  className="shrink-0 mt-1 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                >
                  {s.actionLabel} <ArrowRight size={10} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
