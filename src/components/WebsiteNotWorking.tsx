import { useI18n } from '../lib/i18n';

export function WebsiteNotWorking() {
  const { t } = useI18n();
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-2xl font-extrabold text-slate-900">{t('notWorking.title')}</div>
        <div className="mt-2 text-sm font-semibold text-slate-600">
          {t('notWorking.subtitle')}
        </div>
      </div>
    </div>
  );
}
