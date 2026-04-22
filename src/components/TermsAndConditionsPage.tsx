import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getSession } from '../lib/db';
import { Button } from './ui/Button';
import { useI18n } from '../lib/i18n';

type TermsAndConditionsPageProps = {
  onBack: () => void;
};

const TERMS_ACCEPTED_KEY_PREFIX = 'take_easy_loan_terms_accepted_user_';
const TERMS_PENDING_KEY_PREFIX = 'take_easy_loan_terms_pending_user_';

export function TermsAndConditionsPage({ onBack }: TermsAndConditionsPageProps) {
  const { t } = useI18n();
  const session = getSession();
  const userId = session?.isLoggedIn ? session.userId : null;

  const [accepted, setAccepted] = useState(false);
  const [agreeNow, setAgreeNow] = useState(false);

  const storageKeys = useMemo(() => {
    if (!userId) return null;
    return {
      acceptedKey: `${TERMS_ACCEPTED_KEY_PREFIX}${userId}`,
      pendingKey: `${TERMS_PENDING_KEY_PREFIX}${userId}`,
    };
  }, [userId]);

  useEffect(() => {
    if (!storageKeys) return;
    try {
      setAccepted(localStorage.getItem(storageKeys.acceptedKey) === '1');
    } catch {
      setAccepted(false);
    }
  }, [storageKeys]);

  if (!session?.isLoggedIn || !userId) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">{t('profile.pleaseLogin')}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">{t('profile.loginToView')}</div>
          <button
            type="button"
            className="mt-5 h-11 w-full rounded-xl bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={onBack}
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0b4a90]">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="mt-4 text-xl font-extrabold text-slate-900">{t('terms.title')}</div>
        <div className="mt-1 text-sm font-semibold text-slate-600">{t('terms.readBefore')}</div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-extrabold text-slate-900">{t('profile.terms')}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('terms.bullet.correctInfo')}</li>
            <li>{t('terms.bullet.docs')}</li>
            <li>{t('terms.bullet.fee')}</li>
            <li>{t('terms.bullet.repay')}</li>
            <li>{t('terms.bullet.contact')}</li>
            <li>{t('terms.bullet.agree')}</li>
          </ul>
        </div>

        {accepted ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-extrabold text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            {t('terms.alreadyAccepted')}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="radio"
                name="termsAcceptedPage"
                checked={agreeNow}
                onChange={() => setAgreeNow(true)}
                className="mt-1 h-4 w-4 accent-[#0b4a90]"
              />
              <span className="text-sm font-semibold text-slate-700">{t('terms.agreeRadio')}</span>
            </label>

            <Button
              type="button"
              disabled={!agreeNow}
              onClick={() => {
                if (!agreeNow || !storageKeys) return;
                try {
                  localStorage.setItem(storageKeys.acceptedKey, '1');
                  localStorage.removeItem(storageKeys.pendingKey);
                } catch {
                }
                setAccepted(true);
              }}
              className="h-11 w-full rounded-xl bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('terms.acceptTerms')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
