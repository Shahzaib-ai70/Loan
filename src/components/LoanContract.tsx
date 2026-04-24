import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { usersApi } from '../lib/api';
import { getCurrentUser, getLatestApplicationForUser, getUserBalance, setUserBalance } from '../lib/db';
import { formatMoney, useCurrency } from '../lib/currency';

type LoanContractProps = {
  onBack: () => void;
};

const fmtDateTime = (ms: number) => {
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-extrabold text-slate-900">{title}</div>
      <div className="mt-3 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm">
      <div className="font-bold text-slate-600">{k}</div>
      <div className="text-right font-extrabold text-slate-900">{v || '-'}</div>
    </div>
  );
}

export function LoanContract({ onBack }: LoanContractProps) {
  const { showCurrencySign, currencySymbol } = useCurrency();
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Please login</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Login to view your loan contract.</div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">No contract available</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">Submit your loan application first.</div>
        </div>
      </div>
    );
  }

  const [balance, setBalance] = useState(() => getUserBalance(app.userId));

  useEffect(() => {
    if (!user || !app) return;
    usersApi
      .getBalance(user.id)
      .then((res) => {
        setUserBalance(user.id, res.balance);
        setBalance(res.balance);
      })
      .catch(() => {});
  }, [app.id, user.id]);
  const contractNo = `${app.id}-${String(app.submittedAt).slice(-6)}`;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" /> Go Back
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b4a90] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#093b74]"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Print Contract
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#0b4a90] px-6 py-8 text-center text-white">
          <div className="text-3xl font-extrabold tracking-wide">LOAN AGREEMENT</div>
          <div className="mt-1 text-xs font-semibold text-white/85">ACCREDITED • LEGALLY BINDING CONTRACT</div>
          <div className="mx-auto mt-5 max-w-[520px] rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold">
            CONTRACT NO: {contractNo}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <Section title="Preamble">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-6">
              <div className="font-semibold">
                THIS LOAN AGREEMENT (hereinafter referred to as the “Agreement”) is made and entered into as of{' '}
                <span className="font-extrabold">{fmtDateTime(app.submittedAt)}</span>, by and between:
              </div>
              <div className="mt-3">
                <div className="font-extrabold text-slate-900">ACCREDITED</div>
                <div className="text-slate-700">
                  a duly organized banking institution existing under the laws of the United States, with its principal office located at 250 Nicollet Mall, Suite 720 Minneapolis, MN 55401, USA
                </div>
              </div>
              <div className="mt-3 font-semibold">AND</div>
              <div className="mt-2">
                <div className="font-extrabold text-slate-900">{app.applicant.fullName}</div>
                <div className="text-slate-700">
                  holder of identification document <span className="font-extrabold">{app.applicant.idCardNumber}</span>, issued on{' '}
                  <span className="font-extrabold">{app.applicant.dateOfIssue}</span> at <span className="font-extrabold">{app.applicant.placeOfIssue}</span>, residing at{' '}
                  <span className="font-extrabold">{app.contact.currentAddress}</span> (hereinafter referred to as the “Borrower”).
                </div>
              </div>
            </div>
          </Section>

          <Section title="Article I: Loan Terms">
            <div>
              <KV k="Loan amount" v={formatMoney(app.loan.amount, showCurrencySign, 2, currencySymbol)} />
              <KV k="Loan term" v={`${app.loan.termMonths} months`} />
              <KV k="Interest rate" v={`${app.loan.interestRate}%`} />
              <KV k="Monthly payment" v={formatMoney(app.loan.monthlyPayment, showCurrencySign, 2, currencySymbol)} />
              <KV k="Total interest" v={formatMoney(app.loan.totalInterest, showCurrencySign, 2, currencySymbol)} />
              <KV k="Total repayment" v={formatMoney(app.loan.totalRepayment, showCurrencySign, 2, currencySymbol)} />
              <KV k="Loan status" v={app.status.replace('_', ' ').toUpperCase()} />
            </div>
          </Section>

          <Section title="Article II: Bank Details (For Disbursement)">
            <div>
              <KV k="Bank name" v={app.bank.bankName} />
              <KV k="Account holder" v={app.bank.accountHolderName} />
              <KV k="Account number" v={app.bank.accountNumber} />
            </div>
          </Section>

          <Section title="Loan Activities">
            <div>
              <KV k="Application submitted" v={fmtDateTime(app.submittedAt)} />
              <KV k="Approved at" v={app.approvedAt ? fmtDateTime(app.approvedAt) : '-'} />
              <KV k="Current balance" v={formatMoney(balance.currentBalance, showCurrencySign, 2, currencySymbol)} />
              <KV k="Withdrawn amount" v={formatMoney(balance.withdrawnAmount, showCurrencySign, 2, currencySymbol)} />
            </div>
          </Section>

          <Section title="Borrower Signature">
            {app.documents.signatureDataUrl ? (
              <img src={app.documents.signatureDataUrl} alt="Signature" className="h-28 w-full rounded-2xl border bg-white object-contain" />
            ) : (
              <div className="rounded-2xl border bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">No signature</div>
            )}
            <div className="mt-3 text-xs font-semibold text-slate-500">
              By signing above, the Borrower acknowledges and agrees to the terms of this Agreement.
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
