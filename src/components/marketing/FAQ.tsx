'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQ_ITEMS } from '@/lib/marketing-content';

type QA = { q: string; a: string };

/**
 * FAQ accordion. Reads the question bank from `marketing-content.ts`
 * so non-engineers can edit copy without touching this file. Defaults
 * to the first item open for SEO and instant value.
 *
 * Accepts an optional `items` override so the homepage can show a
 * shorter "preview" set while /faqs shows the full list.
 */
export function FAQ({ items }: { items?: QA[] }) {
  const list = items ?? FAQ_ITEMS;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl">
      <ul className="space-y-3">
        {list.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <li key={i} className="card overflow-hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-semibold text-slate-900">{item.q}</span>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-slate-500 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-slate-700">
                  {item.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
