'use client';

import clsx from 'clsx';
import type { PropsWithChildren } from 'react';
import { useEffect, useId } from 'react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
}>;

export function Modal({ open, onClose, title, description, className, children }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close modal"
        onClick={onClose}
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div
        className={clsx(
          'relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="mb-5">
          <h2 id={titleId} className="text-xl font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
