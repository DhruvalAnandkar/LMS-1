'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          primary:
            'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-300',
          secondary:
            'bg-white text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-200',
          outline:
            'border border-slate-300 text-slate-900 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-200',
          ghost:
            'text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-200',
        }[variant],
        {
          sm: 'h-9 px-3 text-sm',
          md: 'h-10 px-4 text-sm',
          lg: 'h-11 px-5 text-base',
        }[size],
        className
      )}
      {...props}
    />
  );
}
