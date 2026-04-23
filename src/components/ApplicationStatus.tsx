import { useEffect, useMemo, useState } from 'react';
import { Clock, FileText, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { applicationsApi } from '../lib/api';
import { getCurrentUser, getLatestApplicationForUser, upsertApplication } from '../lib/db';
import { formatMoney, useCurrency } from '../lib/currency';

type ApplicationStatusProps = {
  onStartNew: () => void;
};

export function ApplicationStatus({ onStartNew }: ApplicationStatusProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { showCurrencySign } = useCurrency();
  const application = useMemo(() => {
    const user = getCurrentUser();
    if (!user) return null;
    return getLatestApplicationForUser(user.id);
  }, [refreshKey]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    applicationsApi
      .getLatest(user.id)
      .then((res) => {
        if (res.application) upsertApplication(res.application as never);
        setRefreshKey((x) => x + 1);
      })
      .catch(() => {});
  }, []);

  if (!application) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">No application found</div>
        <p className="mt-2 text-sm text-slate-600">Start a new loan application to continue.</p>
        <div className="mt-5">
          <Button
            className="h-11 rounded-lg bg-[#0b4a90] px-6 text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={onStartNew}
          >
            Start Application
          </Button>
        </div>
      </div>
    );
  }

  const statusLabel =
    application.statusLabel ||
    (application.status === 'under_review' ? 'Under Review' : application.status === 'approved' ? 'Approved' : 'Rejected');

  const statusTone =
    application.status === 'under_review'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : application.status === 'approved'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-700 border-red-200';

  const submittedDate = new Date(application.submittedAt).toLocaleString();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Application Status</h1>
            <p className="mt-1 text-sm text-slate-600">Application ID: <span className="font-extrabold">{application.id}</span></p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-extrabold ${statusTone}`}>
            <Clock className="h-4 w-4" />
            {statusLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f8fbff] p-4 ring-1 ring-slate-200">
            <div className="text-xs font-extrabold tracking-wide text-[#0b4a90]">Submitted</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{submittedDate}</div>
          </div>
          <div className="rounded-xl bg-[#f8fbff] p-4 ring-1 ring-slate-200">
            <div className="text-xs font-extrabold tracking-wide text-[#0b4a90]">Loan Amount</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {application.loan ? formatMoney(application.loan.amount, showCurrencySign, 0) : '-'}
            </div>
          </div>
          <div className="rounded-xl bg-[#f8fbff] p-4 ring-1 ring-slate-200">
            <div className="text-xs font-extrabold tracking-wide text-[#0b4a90]">Applicant</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{application.applicant?.fullName ?? '-'}</div>
          </div>
        </div>

        {application.loan && (
          <div className="mt-6 rounded-2xl bg-[#0b4a90] p-6 text-white shadow-sm">
            <div className="text-center text-3xl font-extrabold text-[#ffd000]">
              {formatMoney(application.loan.monthlyPayment, showCurrencySign, 2)}
            </div>
            <div className="mt-2 text-center text-sm font-semibold text-white/80">Monthly Payment</div>

            <div className="mt-6 space-y-3 text-sm font-semibold">
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-white/90">Monthly Payment</span>
                <span>{formatMoney(application.loan.monthlyPayment, showCurrencySign, 2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-white/90">Total Loan Amount</span>
                <span>{formatMoney(application.loan.amount, showCurrencySign, 0)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-white/90">Loan Term</span>
                <span>{application.loan.termMonths ?? '-'} months</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-white/90">Interest Rate</span>
                <span>{application.loan.interestRate}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-white/90">Total Interest</span>
                <span>{formatMoney(application.loan.totalInterest, showCurrencySign, 2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/90">Total Repayment</span>
                <span>{formatMoney(application.loan.totalRepayment, showCurrencySign, 2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-extrabold text-slate-900">Applicant Details</div>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div>Full Name: <span className="font-semibold text-slate-900">{application.applicant.fullName}</span></div>
              <div>ID Card: <span className="font-semibold text-slate-900">{application.applicant.idCardNumber}</span></div>
              <div>Current Job: <span className="font-semibold text-slate-900">{application.contact.currentJob}</span></div>
              <div>Current Address: <span className="font-semibold text-slate-900">{application.contact.currentAddress}</span></div>
              <div>Bank: <span className="font-semibold text-slate-900">{application.bank.bankName}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-extrabold text-slate-900">Documents & Signature</div>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div>Front ID: <span className="font-semibold text-slate-900">{application.documents.idFrontName || '-'}</span></div>
              <div>Back ID: <span className="font-semibold text-slate-900">{application.documents.idBackName || '-'}</span></div>
              <div>Selfie: <span className="font-semibold text-slate-900">{application.documents.selfieHoldingIdName || '-'}</span></div>
            </div>
            {application.documents.signatureDataUrl && (
              <img
                src={application.documents.signatureDataUrl}
                alt="Signature"
                className="mt-3 h-24 w-full rounded border object-contain bg-slate-50"
              />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0b4a90]" />
            <div className="text-sm font-extrabold text-slate-900">Review Process</div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {application.statusNote
              ? application.statusNote
              : application.status === 'approved'
                ? 'Your application is approved. You can proceed to withdraw when admin assigns your withdrawal code.'
                : application.status === 'rejected'
                  ? 'Your application was not approved. Please contact customer service.'
                  : 'Your application is being reviewed. It will remain under review until an admin approves it.'}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-11 rounded-lg bg-[#0b4a90] px-6 text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={() => {
              const user = getCurrentUser();
              if (!user) return;
              applicationsApi
                .getLatest(user.id)
                .then((res) => {
                  if (res.application) upsertApplication(res.application as never);
                  setRefreshKey((x) => x + 1);
                })
                .catch(() => {});
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-lg px-6 text-sm font-extrabold"
            onClick={onStartNew}
          >
            Back to Profile
          </Button>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FileText className="h-4 w-4" />
            Status updates appear here
          </div>
        </div>
      </div>
    </div>
  );
}
