import { ChevronLeft } from 'lucide-react';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';

type MyInformationBankProps = {
  onBack: () => void;
};

const pillInput =
  'h-11 w-full rounded-full border border-[#0b4a90]/35 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none';
const labelClass = 'text-sm font-bold text-slate-700';

export function MyInformationBank({ onBack }: MyInformationBankProps) {
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;

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
        <span className="font-bold text-[#0b4a90]">Bank Information</span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div>
            <div className={labelClass}>Application Name *</div>
            <input value={app.bank.bankName} readOnly className={pillInput} />
          </div>
          <div>
            <div className={labelClass}>Account holder name *</div>
            <input value={app.bank.accountHolderName} readOnly className={pillInput} />
          </div>
          <div>
            <div className={labelClass}>Number account *</div>
            <input value={app.bank.accountNumber} readOnly className={pillInput} />
          </div>
        </div>
      </div>
    </div>
  );
}
