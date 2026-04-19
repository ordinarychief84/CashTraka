import { Check } from 'lucide-react';
import { Reveal } from './Reveal';

type Item = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: string[];
  visual: React.ReactNode;
};

type Props = {
  items: Item[];
};

export function FeatureDeepDive({ items }: Props) {
  return (
    <div className="space-y-20 md:space-y-28">
      {items.map((it, i) => {
        const imageFirst = i % 2 === 1;
        return (
          <div
            key={it.title}
            className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
          >
            <Reveal from={imageFirst ? 'right' : 'left'} className={imageFirst ? 'md:order-last' : ''}>
              <div>
                {it.eyebrow && (
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {it.eyebrow}
                  </div>
                )}
                <h3 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
                  {it.title}
                </h3>
                <p className="mt-3 text-base text-slate-600 md:text-lg">{it.body}</p>
                {it.bullets && it.bullets.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {it.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <Check size={13} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
            <Reveal from={imageFirst ? 'left' : 'right'} delay={120}>
              {it.visual}
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}
