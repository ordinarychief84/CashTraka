'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

type Props = {
  src: string | null | undefined;
  alt?: string;
  /** Tailwind classes for the wrapping element. Should set width/height. */
  className?: string;
  /** Tailwind classes for the inner img. Defaults to "h-full w-full object-cover". */
  imgClassName?: string;
  /** Override the fallback content shown when src is missing or fails to load. */
  fallback?: React.ReactNode;
};

/**
 * <img> with built-in graceful fallback for broken / missing URLs.
 * Used everywhere user-uploaded images render so a 404 from the CDN does
 * not produce a broken-image icon. Stays SSR-safe (the initial render is
 * the img; the fallback only swaps in client-side after the load error).
 */
export function SafeImage({
  src,
  alt = '',
  className,
  imgClassName,
  fallback,
}: Props) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

  return (
    <div className={className}>
      {showFallback ? (
        fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <ImageOff size={20} />
          </div>
        )
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={imgClassName ?? 'h-full w-full object-cover'}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
