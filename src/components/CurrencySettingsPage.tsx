import { ChevronLeft, DollarSign } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { Button } from './ui/Button';
import { useI18n } from '../lib/i18n';

type CurrencySettingsPageProps = {
  onBack: () => void;
};

export function CurrencySettingsPage({ onBack }: CurrencySettingsPageProps) {
  const { t } = useI18n();
  const { showCurrencySign, setShowCurrencySign } = useCurrency();

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0b4a90]">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">Currency sign</div>
            <div className="text-sm font-semibold text-slate-600">Turn $ on/off for customer pages</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="currencySign"
              checked={showCurrencySign}
              onChange={() => setShowCurrencySign(true)}
              className="mt-1 h-4 w-4 accent-[#0b4a90]"
            />
            <span className="text-sm font-semibold text-slate-700">Show $ sign</span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="currencySign"
              checked={!showCurrencySign}
              onChange={() => setShowCurrencySign(false)}
              className="mt-1 h-4 w-4 accent-[#0b4a90]"
            />
            <span className="text-sm font-semibold text-slate-700">Hide $ sign (numbers only)</span>
          </label>
        </div>

        <div className="mt-5">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl text-sm font-extrabold" onClick={onBack}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
