import { ChevronLeft, PiggyBank } from 'lucide-react';

type DepositRatesPageProps = {
  onBack: () => void;
};

export function DepositRatesPage({ onBack }: DepositRatesPageProps) {
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
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">Deposit Rates</div>
              <div className="mt-1 text-sm font-semibold text-white/80">Secure savings options</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              { t: '3 Months', r: '2.10%', d: 'Short-term deposit option.' },
              { t: '12 Months', r: '3.25%', d: 'Balanced savings with better return.' },
              { t: '24 Months', r: '3.90%', d: 'Long-term savings with higher rate.' },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-extrabold text-slate-900">{x.t}</div>
                <div className="mt-2 text-2xl font-extrabold text-[#0b4a90]">{x.r}</div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{x.d}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            These rates are for display. If you want, I can make this page editable from the Admin Panel.
          </div>
        </div>
      </div>
    </div>
  );
}

