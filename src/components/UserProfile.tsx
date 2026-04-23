import { CalendarClock, ChevronRight, CircleDollarSign, FileSignature, FileText, Info, LogOut, ScrollText, UserRound } from 'lucide-react';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';
import { useI18n } from '../lib/i18n';

type UserProfileProps = {
  onNavigate: (to: 'my-information' | 'application-status' | 'loan-contract' | 'terms-and-conditions' | 'appointment' | 'currency-settings' | 'auth') => void;
  onLogout: () => void;
};

const card = 'rounded-2xl bg-gradient-to-br from-[#5263b0] to-[#2b7a78] text-white';
const optionRow =
  'flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:bg-slate-50';
const iconBox = 'flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9eefc] text-[#5a6ad6]';

const initialsFrom = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  const s = `${a}${b}`.toUpperCase();
  return s || 'U';
};

export function UserProfile({ onNavigate, onLogout }: UserProfileProps) {
  const { t } = useI18n();
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">{t('profile.pleaseLogin')}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">{t('profile.loginToView')}</div>
          <button
            type="button"
            className="mt-5 h-11 w-full rounded-xl bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={() => onNavigate('auth')}
          >
            {t('profile.goToLogin')}
          </button>
        </div>
      </div>
    );
  }

  const displayName = app?.applicant.fullName?.trim() || user.phoneOrEmail.split('@')[0] || 'Customer';

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6">
      <div className={`${card} p-6 shadow-sm`}>
        <div className="flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-extrabold">
            {initialsFrom(displayName)}
          </div>
        </div>
        <div className="mt-3 text-center">
          <div className="text-xs font-semibold text-white/85">{t('profile.welcomeBack')}</div>
          <div className="mt-1 text-2xl font-extrabold">{displayName}</div>
          <div className="mt-1 text-xs font-semibold text-white/80">{user.phoneOrEmail}</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <button type="button" className={optionRow} onClick={() => onNavigate('my-information')}>
          <div className={iconBox}>
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">{t('profile.myInformation')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={optionRow} onClick={() => onNavigate('application-status')}>
          <div className={iconBox}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">{t('profile.loanStatus')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={optionRow} onClick={() => onNavigate('loan-contract')}>
          <div className={iconBox}>
            <FileSignature className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">{t('profile.loanContract')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={optionRow} onClick={() => onNavigate('terms-and-conditions')}>
          <div className={iconBox}>
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">{t('profile.terms')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={optionRow} onClick={() => onNavigate('appointment')}>
          <div className={iconBox}>
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">Appointment</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button type="button" className={optionRow} onClick={() => onNavigate('currency-settings')}>
          <div className={iconBox}>
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900">Currency sign</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-4 text-left shadow-sm hover:bg-red-100"
          onClick={onLogout}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-red-600">{t('common.logout')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-red-400" />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <UserRound className="h-4 w-4" />
        {t('profile.accountDetails')}
      </div>
    </div>
  );
}
