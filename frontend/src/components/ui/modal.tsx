'use client';

import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
}>;

export function Modal({ open, onClose, title, description, className, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div
        className={clsx(
          'relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl',
          className
        )}
      >
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
