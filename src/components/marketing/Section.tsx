import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'muted';
};

/**
 * Reusable marketing section wrapper.
 * Provides consistent vertical rhythm, max width, and optional heading block.
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  tone = 'default',
}: Props) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20 py-16 md:py-24',
        tone === 'muted' && 'bg-slate-50',
        className,
      )}
    >
      <div className="container-app">
        {(eyebrow || title || subtitle) && (
          <div className="mx-auto max-w-2xl text-center">
            {eyebrow && (
              <div className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-3 text-base text-slate-600 md:text-lg">{subtitle}</p>
            )}
          </div>
        )}
        <div className={cn((eyebrow || title || subtitle) && 'mt-10 md:mt-12')}>
          {children}
        </div>
      </div>
    </section>
  );
}
