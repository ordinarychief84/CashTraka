'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  /** Pre-rendered icon node. Pass e.g. <Wallet size={22} /> from the server. */
  icon: React.ReactNode;
  title: string;
  body: string;
};

type Props = {
  items: Item[];
};

export function FeatureCarousel({ items }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, []);

  function scrollDir(dir: 'prev' | 'next') {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>('[data-card]');
    const step = (firstCard?.offsetWidth ?? 320) + 16; // gap-4
    el.scrollBy({ left: dir === 'next' ? step : -step, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollDir('prev')}
          disabled={atStart}
          aria-label="Previous"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-slate-700 transition',
            'hover:bg-slate-50 active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollDir('next')}
          disabled={atEnd}
          aria-label="Next"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-slate-700 transition',
            'hover:bg-slate-50 active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        ref={trackRef}
        className={cn(
          '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((f) => (
          <div
            key={f.title}
            data-card
            className="card group flex w-[80vw] max-w-[360px] shrink-0 snap-start flex-col p-6 transition hover:-translate-y-1 hover:shadow-md md:w-[360px]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              {f.icon}
            </div>
            <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
