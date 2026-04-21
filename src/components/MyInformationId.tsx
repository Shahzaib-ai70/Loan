import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Modal } from './Modal';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';

type MyInformationIdProps = {
  onBack: () => void;
};

const pillInput =
  'h-11 w-full rounded-full border border-[#0b4a90]/35 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none';
const labelClass = 'text-sm font-bold text-slate-700';

function ImgTile({
  title,
  src,
  fallback,
  onOpen,
}: {
  title: string;
  src?: string;
  fallback?: string;
  onOpen: (title: string, src: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-extrabold text-slate-700">{title}</div>
      <div className="mt-3">
        {src ? (
          <button type="button" className="block w-full" onClick={() => onOpen(title, src)}>
            <img src={src} alt={title} className="h-40 w-full rounded-xl border bg-white object-cover" />
          </button>
        ) : (
          <div className="rounded-xl border bg-slate-50 px-3 py-10 text-center text-sm font-semibold text-slate-500">
            {fallback || 'No image'}
          </div>
        )}
      </div>
    </div>
  );
}

export function MyInformationId({ onBack }: MyInformationIdProps) {
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;
  const [preview, setPreview] = useState<{ title: string; src: string } | null>(null);

  const docs = useMemo(
    () => ({
      front: { title: 'Front Side', src: app?.documents.idFrontDataUrl, fallback: app?.documents.idFrontName },
      back: { title: 'Back Side', src: app?.documents.idBackDataUrl, fallback: app?.documents.idBackName },
      selfie: { title: 'Selfie Holding ID', src: app?.documents.selfieHoldingIdDataUrl, fallback: app?.documents.selfieHoldingIdName },
    }),
    [app],
  );

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
        <span className="font-bold text-[#0b4a90]">ID/Passport Information</span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div>
            <div className={labelClass}>Full name *</div>
            <input value={app.applicant.fullName} readOnly className={pillInput} />
          </div>
          <div>
            <div className={labelClass}>ID card *</div>
            <input value={app.applicant.idCardNumber} readOnly className={pillInput} />
          </div>
          <div>
            <div className={labelClass}>Date of issue *</div>
            <input value={app.applicant.dateOfIssue} readOnly className={pillInput} />
          </div>
          <div>
            <div className={labelClass}>Place of issue *</div>
            <input value={app.applicant.placeOfIssue} readOnly className={pillInput} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <ImgTile {...docs.front} onOpen={(title, src) => setPreview({ title, src })} />
        <ImgTile {...docs.back} onOpen={(title, src) => setPreview({ title, src })} />
        <ImgTile {...docs.selfie} onOpen={(title, src) => setPreview({ title, src })} />
      </div>

      <Modal
        open={!!preview}
        title={preview?.title}
        onClose={() => setPreview(null)}
        maxWidthClassName="max-w-3xl"
      >
        {preview && <img src={preview.src} alt={preview.title} className="max-h-[70vh] w-full rounded-xl border bg-white object-contain" />}
      </Modal>
    </div>
  );
}
