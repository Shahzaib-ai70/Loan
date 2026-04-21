import { Building2, ChevronLeft, ChevronRight, CreditCard, PenTool, UserRound } from 'lucide-react';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';

type MyInformationProps = {
  onBack: () => void;
  onNavigate: (to: 'my-information-id' | 'my-information-contact' | 'my-information-bank' | 'my-information-signature') => void;
};

const pill =
  'flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:bg-slate-50';
const iconBox = 'flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9eefc] text-[#5a6ad6]';

export function MyInformation({ onBack, onNavigate }: MyInformationProps) {
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Please login</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Login to view your application information.</div>
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
          <ChevronLeft className="h-4 w-4" /> Back to Profile
        </button>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">No application found</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Submit your loan application first to see details here.</div>
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
        <ChevronLeft className="h-4 w-4" /> Back to Profile
      </button>

      <div className="mt-4 rounded-3xl bg-gradient-to-r from-[#b07eb8] to-[#5760d6] px-6 py-7 text-center text-white shadow-sm">
        <div className="text-2xl font-extrabold">All Informations</div>
        <div className="mt-1 text-xs font-semibold text-white/85">Manage your account details and application information</div>
      </div>

      <div className="mt-6 space-y-4">
        <button type="button" className={pill} onClick={() => onNavigate('my-information-id')}>
          <div className={iconBox}>
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">ID/Passport Information</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={pill} onClick={() => onNavigate('my-information-contact')}>
          <div className={iconBox}>
            <UserRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">Contact Information</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={pill} onClick={() => onNavigate('my-information-bank')}>
          <div className={iconBox}>
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">Bank Information</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={pill} onClick={() => onNavigate('my-information-signature')}>
          <div className={iconBox}>
            <PenTool className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">Signature Information</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
