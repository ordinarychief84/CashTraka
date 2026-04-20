'use client';

import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';
import Link from 'next/link';

type ScoreData = {
  score: number;
  onTimeRate: number;
  avgCollectionDays: number;
  collectedAmount: number;
  outstandingAmount: number;
  activeReminders: number;
  trend: 'up' | 'down' | 'stable';
  previousScore: number | null;
};

function ScoreRing({ score }: { score: number }) {
  // Color based on score
  const color = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';
  const bg = score >= 70 ? 'bg-green-50' : score >= 40 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${bg} border-2 border-current ${color}`}>
      <span className="text-xl font-bold">{score}</span>
    </div>
  );
}

export function CollectionScoreWidget({ isPaid }: { isPaid: boolean }) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPaid) {
      setLoading(false);
      return;
    }
    fetch('/api/collection-score')
      .then((r) => r.json())
      .then((d) => {
        if (d.score !== undefined) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPaid]);

  if (!isPaid) {
    return (
      <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Gauge size={16} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Collection Score</span>
          <Lock size={12} className="text-slate-400" />
        </div>
        <p className="text-[11px] text-slate-500">
          Upgrade to track your collection effectiveness.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm animate-pulse">
        <div className="h-16 w-16 rounded-full bg-slate-200 mx-auto mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-24 mx-auto"></div>
      </div>
    );
  }

  if (!data) return null;

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <Link href="/collections" className="block rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-slate-800">Collection Score</span>
            <TrendIcon size={14} className={trendColor} />
          </div>
          <div className="flex gap-4 text-[11px] text-slate-500">
            <span>{data.onTimeRate}% on-time</span>
            <span>{data.avgCollectionDays}d avg</span>
            <span>{data.activeReminders} rules</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
