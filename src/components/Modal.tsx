import { type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
};

export function Modal({ open, title, children, onClose, maxWidthClassName }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`absolute left-1/2 top-1/2 max-h-[90vh] w-[92%] ${maxWidthClassName ?? 'max-w-md'} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`}
      >
        {title && <div className="text-lg font-extrabold text-slate-900">{title}</div>}
        <div className={title ? 'mt-3' : ''}>{children}</div>
      </div>
    </div>
  );
}
