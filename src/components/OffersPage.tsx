import { ChevronLeft, Sparkles } from 'lucide-react';

type OffersPageProps = {
  onBack: () => void;
  onApply: () => void;
};

export function OffersPage({ onBack, onApply }: OffersPageProps) {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0b4a90] to-[#093b74] px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">Attractive Offers</div>
              <div className="mt-1 text-sm font-semibold text-white/80">New rates and promotions for customers</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              { title: 'Fast Approval', value: 'Decision in minutes', desc: 'Submit your loan application online with instant processing.' },
              { title: 'Flexible Terms', value: '3 to 120 months', desc: 'Choose a loan term that fits your repayment plan.' },
              { title: 'Secure Process', value: 'Protected documents', desc: 'Upload documents and sign securely with digital signature.' },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-extrabold text-slate-900">{c.title}</div>
                <div className="mt-2 text-lg font-extrabold text-[#0b4a90]">{c.value}</div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-extrabold text-slate-900">Ready to apply?</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              Create your account, submit your documents, and track your loan status from your profile.
            </div>
            <button
              type="button"
              className="mt-4 h-11 rounded-xl bg-[#0b4a90] px-6 text-sm font-extrabold text-white hover:bg-[#093b74]"
              onClick={onApply}
            >
              Apply Loan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

