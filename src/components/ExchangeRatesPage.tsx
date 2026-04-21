import { ChevronLeft, TrendingUp } from 'lucide-react';

type ExchangeRatesPageProps = {
  onBack: () => void;
};

export function ExchangeRatesPage({ onBack }: ExchangeRatesPageProps) {
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
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">Exchange Rates</div>
              <div className="mt-1 text-sm font-semibold text-white/80">Daily market updates</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            This page is a professional placeholder. If you want, I can connect it to a real exchange-rate API and show live rates.
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[520px] w-full text-left text-sm">
              <thead className="bg-white text-slate-700">
                <tr>
                  {['Currency', 'Buy', 'Sell', 'Updated'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-extrabold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {[
                  { c: 'USD', buy: '1.0000', sell: '1.0000' },
                  { c: 'EUR', buy: '0.9200', sell: '0.9400' },
                  { c: 'GBP', buy: '0.7800', sell: '0.8000' },
                  { c: 'CAD', buy: '1.3500', sell: '1.3700' },
                ].map((r) => (
                  <tr key={r.c} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{r.c}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.buy}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.sell}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{new Date().toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

