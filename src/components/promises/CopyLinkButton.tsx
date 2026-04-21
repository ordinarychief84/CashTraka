'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied\!' : 'Copy payment link'}
    </button>
  );
}
