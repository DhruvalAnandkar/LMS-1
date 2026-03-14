import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        {
          neutral: 'bg-slate-100 text-slate-700',
          success: 'bg-emerald-100 text-emerald-700',
          warning: 'bg-amber-100 text-amber-700',
          danger: 'bg-rose-100 text-rose-700',
          accent: 'bg-sky-100 text-sky-700',
        }[tone],
        className
      )}
      {...props}
    />
  );
}
