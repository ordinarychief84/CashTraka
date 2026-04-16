import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const iconBox: Record<Size, string> = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
};

const iconSvg: Record<Size, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const wordmark: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

/** Icon-only mark. Rounded square with a white check — represents "confirmed payment". */
export function LogoIcon({
  size = 'md',
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-brand-500 text-white',
        iconBox[size],
        className,
      )}
    >
      <CheckMark className={iconSvg[size]} />
    </span>
  );
}

/** Full logo: icon + "CashTraka" wordmark. */
export function Logo({
  size = 'md',
  className,
  href,
}: {
  size?: Size;
  className?: string;
  /** Optional — if passed, the root becomes an <a>. Normally you'd wrap with Link yourself. */
  href?: string;
}) {
  const content = (
    <>
      <LogoIcon size={size} />
      <span className={cn('font-bold tracking-tight text-ink', wordmark[size])}>
        CashTraka
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn('inline-flex items-center gap-2', className)}>
        {content}
      </a>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>{content}</span>
  );
}

/** The bare check-mark glyph. Used inside LogoIcon; exported in case anywhere else needs it. */
export function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
