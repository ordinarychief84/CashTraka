'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  label?: string;
  small?: boolean;
  className?: string;
};

export function CopyButton({ value, label = 'Copy', small, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handle() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback: prompt
      prompt('Copy:', value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-white font-semibold text-slate-700 hover:bg-slate-50',
        small ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs',
        className,
      )}
    >
      {copied ? <Check size={small ? 12 : 14} /> : <Copy size={small ? 12 : 14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}
