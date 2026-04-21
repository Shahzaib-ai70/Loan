import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Modal } from './Modal';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';

type MyInformationSignatureProps = {
  onBack: () => void;
};

export function MyInformationSignature({ onBack }: MyInformationSignatureProps) {
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Please login</div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">No application found</div>
        </div>
      </div>
    );
  }

  const src = app.documents.signatureDataUrl;

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-3 text-xs text-slate-500">
        Home <span className="px-2">|</span>{' '}
        <span className="font-bold text-[#0b4a90]">Signature Information</span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">Borrower Signature</div>
        <div className="mt-3">
          {src ? (
            <button type="button" className="block w-full" onClick={() => setOpen(true)}>
              <img src={src} alt="Signature" className="h-44 w-full rounded-2xl border bg-white object-contain" />
            </button>
          ) : (
            <div className="rounded-xl border bg-slate-50 px-3 py-10 text-center text-sm font-semibold text-slate-500">No signature</div>
          )}
        </div>
      </div>

      <Modal open={open} title="Signature" onClose={() => setOpen(false)} maxWidthClassName="max-w-3xl">
        {src && <img src={src} alt="Signature" className="max-h-[70vh] w-full rounded-xl border bg-white object-contain" />}
      </Modal>
    </div>
  );
}
