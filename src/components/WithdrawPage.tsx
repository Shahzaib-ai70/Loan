import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { applicationsApi, usersApi, withdrawApi } from '../lib/api';
import { getCurrentUser, getLatestApplicationForUser, getUserBalance, setUserBalance, upsertApplication } from '../lib/db';

type WithdrawPageProps = {
  onNavigate: (to: 'dashboard' | 'withdraw' | 'application-status' | 'auth' | 'register' | 'loan-application' | 'admin') => void;
};

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function WithdrawPage({ onNavigate }: WithdrawPageProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const user = getCurrentUser();
  const app = useMemo(() => (user ? getLatestApplicationForUser(user.id) : null), [refreshKey, user?.id]);
  const balance = useMemo(
    () => (user ? getUserBalance(user.id) : { currentBalance: 0, withdrawnAmount: 0 }),
    [refreshKey, user?.id],
  );

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('Notification');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [snapshot, setSnapshot] = useState(balance);
  const [withdrawnNow, setWithdrawnNow] = useState(0);

  const status = app?.status ?? 'under_review';
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  const withdrawError = String(app?.withdrawError || '').trim();

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      applicationsApi.getLatest(user.id).then((res) => {
        if (res.application) upsertApplication(res.application as never);
      }),
      usersApi.getBalance(user.id).then((res) => {
        setUserBalance(user.id, res.balance);
        setSnapshot(res.balance);
      }),
    ])
      .then(() => setRefreshKey((x) => x + 1))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user || !app) return;
    if (app.status !== 'approved') return;
    const b = getUserBalance(user.id);
    if (b.currentBalance > 0 || b.withdrawnAmount > 0) {
      setSnapshot(b);
      return;
    }
    const seeded = {
      currentBalance: app.loan.amount,
      withdrawnAmount: 0,
    };
    setUserBalance(user.id, seeded);
    setSnapshot(seeded);
  }, [app, user]);

  const onWithdraw = () => {
    setError('');
    if (!user) {
      onNavigate('auth');
      return;
    }
    if (!app) {
      setError('No application found.');
      return;
    }
    if (!approved) {
      setError('Your loan is under review until admin approves.');
      setNoticeTitle('Notification');
      setNoticeMessage('Your loan is under review until admin approves.');
      setNoticeOpen(true);
      return;
    }
    if (withdrawError) {
      setError(withdrawError);
      setNoticeTitle('Notification');
      setNoticeMessage(withdrawError);
      setNoticeOpen(true);
      return;
    }
    withdrawApi
      .withdraw({ userId: user.id, code: code.trim() })
      .then((res) => {
        setWithdrawnNow(res.amount || 0);
        setUserBalance(user.id, res.balance);
        setSnapshot(res.balance);
        setCongratsOpen(true);
        setCode('');
        return Promise.allSettled([
          applicationsApi.getLatest(user.id).then((r) => {
            if (r.application) upsertApplication(r.application as never);
          }),
          usersApi.getBalance(user.id).then((r) => {
            setUserBalance(user.id, r.balance);
            setSnapshot(r.balance);
          }),
        ]);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Withdraw failed.';
        setError(msg);
        setNoticeTitle('Notification');
        setNoticeMessage(msg);
        setNoticeOpen(true);
      });
  };

  const onCancel = () => {
    setCode('');
    setError('');
  };

  const agreementDate = app?.approvedAt ?? app?.submittedAt ?? Date.now();

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-4 px-4 pb-10 pt-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg px-4 text-sm font-extrabold"
          onClick={() => onNavigate('dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-center text-sm font-extrabold text-[#0b4a90]">Loan Information</div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-2 gap-0">
            <div className="border-b border-r border-slate-200 p-4 text-sm font-semibold text-slate-700">Name:</div>
            <div className="border-b border-slate-200 p-4 text-right text-sm font-extrabold text-slate-900">
              {app?.applicant?.fullName ?? '-'}
            </div>
            <div className="border-r border-slate-200 p-4 text-sm font-semibold text-slate-700">Agreement start date:</div>
            <div className="p-4 text-right text-sm font-extrabold text-slate-900">
              {new Date(agreementDate).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0b4a90] p-6 text-white shadow-sm">
        <div className="text-center text-sm font-extrabold text-white/90">Current Balance</div>
        <div className="mt-2 text-center text-4xl font-extrabold">${money(snapshot.currentBalance)}</div>
        <div className="mt-4 text-center text-sm font-extrabold text-[#ffd000]">Withdrawn Amount</div>
        <div className="mt-2 text-center text-3xl font-extrabold">${money(snapshot.withdrawnAmount)}</div>
      </div>

      {withdrawError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
          {withdrawError}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">Enter Withdrawal Code</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit code"
          className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
        />

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            className="h-11 rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={onWithdraw}
            disabled={!approved || !!withdrawError}
          >
            WITHDRAW
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-lg text-sm font-extrabold" onClick={onCancel}>
            CANCEL
          </Button>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-5 shadow-sm ${
          approved
            ? 'border-green-200 bg-green-50'
            : rejected
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div
          className={`text-sm font-extrabold ${
            approved ? 'text-green-700' : rejected ? 'text-red-700' : 'text-amber-700'
          }`}
        >
          LOAN STATUS: {app?.statusLabel || (approved ? 'Approved' : rejected ? 'Rejected' : 'Under Review')}
        </div>
        <div
          className={`mt-2 text-sm font-semibold ${
            approved ? 'text-green-700/90' : rejected ? 'text-red-700/90' : 'text-amber-700/90'
          }`}
        >
          {app?.statusNote
            ? app.statusNote
            : approved
              ? 'Notice: Your loan is approved. Enter your withdrawal code to withdraw the amount.'
              : rejected
                ? 'Notice: Your loan request was not approved. Please contact customer service.'
                : 'Notice: Hello! Our staff is actively processing your request. The next steps will be carried out promptly.'}
        </div>
      </div>

      <Modal
        open={congratsOpen}
        title="Congratulations"
        onClose={() => setCongratsOpen(false)}
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <ShieldCheck className="h-6 w-6 text-green-700" />
          </div>
          <div className="text-sm font-semibold text-slate-700">Your loan approved.</div>
          <div className="text-2xl font-extrabold text-[#0b4a90]">${money(withdrawnNow)}</div>
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={() => setCongratsOpen(false)}
          >
            OK
          </Button>
        </div>
      </Modal>

      <Modal
        open={noticeOpen}
        title={noticeTitle}
        onClose={() => setNoticeOpen(false)}
      >
        <div className="space-y-3 text-center">
          <div className="text-base font-semibold text-slate-700">{noticeMessage}</div>
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={() => setNoticeOpen(false)}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
