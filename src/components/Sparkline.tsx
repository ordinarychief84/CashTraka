import { cn } from '@/lib/utils';

type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Tiny inline-SVG sparkline. No chart library, no axes — just the shape.
 */
export function Sparkline({ values, width = 120, height = 36, className }: Props) {
  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={cn('text-slate-200', className)}
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const step = values.length === 1 ? width : width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    // leave a small top/bottom padding
    const y = height - 2 - (v / max) * (height - 4);
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const fillPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('text-brand-500', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2.5}
          fill="currentColor"
        />
      )}
    </svg>
  );
}
