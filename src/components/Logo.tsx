import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Display sizes tuned so the mark keeps real visual presence at every
 * context. Previous `md` was 36px which read as a thumbnail — bumped so the
 * brand doesn't disappear in chrome.
 */
const iconBox: Record<Size, string> = {
  sm: 'h-8 w-8',   // 32px — tight contexts (mobile bottom bars, print)
  md: 'h-10 w-10', // 40px — navbar, app shell
  lg: 'h-14 w-14', // 56px — auth pages, section accents
  xl: 'h-20 w-20', // 80px — marketing hero
};

const wordmark: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

/**
 * CashTraka mark — two-half circular logo.
 *
 * Top (cyan) and bottom (lime) halves mirror `brand-500` / `success-500` in
 * tailwind.config. Rendered as inline SVG (not <img>) so it stays crisp on
 * retina and scales via Tailwind utility classes.
 *
 * The paths are tuned to match the official logo's asymmetric "S" twist
 * (top dome dips slightly right, bottom dome dips slightly left) — keep in
 * sync with `public/logo.svg`, `src/app/icon.svg`, `public/manifest`.
 */
export function LogoIcon({
  size = 'md',
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 200"
      className={cn('shrink-0', iconBox[size], className)}
      fill="none"
    >
      {/* Top — blue dome */}
      <path
        d="M 80,4 C 43.6,4 14,33.6 14,70 L 14,94 C 14,94 56,106 120,99 L 146,72 C 146,34.2 117.4,4 80,4 Z"
        fill="#00B8E8"
      />
      {/* Bottom — green dome */}
      <path
        d="M 80,196 C 116.4,196 146,166.4 146,130 L 146,106 C 146,106 104,94 40,101 L 14,128 C 14,165.8 42.6,196 80,196 Z"
        fill="#8BD91E"
      />
    </svg>
  );
}

/**
 * Full logo: icon + "CashTraka" wordmark.
 *
 * `variant="light"` flips the wordmark to white so the logo stays readable
 * on dark surfaces (e.g. the admin sidebar).
 */
export function Logo({
  size = 'md',
  className,
  href,
  variant = 'default',
}: {
  size?: Size;
  className?: string;
  /** Optional — if passed, the root becomes an <a>. Normally you'd wrap with Link yourself. */
  href?: string;
  variant?: 'default' | 'light';
}) {
  const content = (
    <>
      <LogoIcon size={size} />
      <span
        className={cn(
          'font-bold tracking-tight',
          variant === 'light' ? 'text-white' : 'text-ink',
          wordmark[size],
        )}
      >
        CashTraka
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn('inline-flex items-center gap-2.5', className)}>
        {content}
      </a>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {content}
    </span>
  );
}

/** Back-compat checkmark glyph — retained for any place that still imports it. */
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
