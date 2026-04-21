import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { adminApi } from '../lib/api';
import {
  type Application,
  type User,
  getDb,
  getUserBalance,
  isAdminLoggedIn,
  setAdminPin,
  setAdminSession,
  setUserBalance,
  upsertApplication,
  upsertUser,
} from '../lib/db';

type AdminEditUserProps = {
  appId: string;
  onBack: () => void;
};

const card = 'rounded-sm border border-slate-200 bg-white';
const field = 'h-9 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-[#0b4a90]';

export function AdminEditUser({ appId, onBack }: AdminEditUserProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftApp, setDraftApp] = useState<Application | null>(null);
  const [draftUser, setDraftUser] = useState<User | null>(null);
  const [balanceInput, setBalanceInput] = useState('0');
  const [docPreview, setDocPreview] = useState<{ title: string; src: string } | null>(null);

  const adminLoggedIn = useMemo(() => isAdminLoggedIn(), [refreshKey]);

  const ensureUserForApp = (app: Application): User => {
    const db = getDb();
    const existing = db.users[app.userId];
    if (existing) return existing;
    const placeholder: User = {
      id: app.userId,
      gender: 'Male',
      phoneOrEmail: `missing-user-${app.userId}@local`,
      password: '123456',
      inviteCode: '',
      createdAt: Date.now(),
      lastApplicationId: app.id,
      disabledLogin: false,
    };
    upsertUser(placeholder);
    return placeholder;
  };

  const load = () => {
    const db = getDb();
    const app = db.applications[appId];
    if (!app) {
      setDraftApp(null);
      setDraftUser(null);
      return;
    }
    const user = ensureUserForApp(app);
    setDraftApp({ ...app });
    setDraftUser({ ...user });
    setBalanceInput(String(getUserBalance(app.userId).currentBalance));
  };

  useEffect(() => {
    if (!adminLoggedIn) return;
    load();
  }, [adminLoggedIn, appId, refreshKey]);

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      const res = await adminApi.login({ username, password });
      setAdminPin(res.adminPin);
      setAdminSession(true);
      setPassword('');
      setRefreshKey((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid admin login.');
    }
  };

  const saveEdit = () => {
    if (!draftApp || !draftUser) return;
    upsertUser(draftUser);
    upsertApplication(draftApp);
    setUserBalance(draftApp.userId, {
      ...getUserBalance(draftApp.userId),
      currentBalance: Number(balanceInput) || 0,
    });
    setRefreshKey((x) => x + 1);
  };

  if (!adminLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-600">Enter admin login to manage customers.</p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={login}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
            />
            <Button className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]">
              Login
            </Button>
            <Button type="button" variant="outline" className="h-11 w-full rounded-lg text-sm font-extrabold" onClick={onBack}>
              Back
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!draftApp || !draftUser) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-4 py-8">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Application not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f7fa]">
      <div className="mx-auto w-full max-w-[1100px] p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" /> Back to Customer List
          </button>
          <Button className="h-10 rounded bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700" onClick={saveEdit}>
            Save
          </Button>
        </div>

        <div className={`${card} mt-4`}>
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="text-xl font-extrabold text-slate-900">Edit User</div>
          </div>

          <div className="p-4">
            <Box title="User">
              <Grid2>
                <EditInput label="Username (Phone/Email)" value={draftUser.phoneOrEmail} onChange={(v) => setDraftUser({ ...draftUser, phoneOrEmail: v })} />
                <EditInput label="Gender" value={draftUser.gender} onChange={(v) => setDraftUser({ ...draftUser, gender: v as User['gender'] })} />
                <EditInput label="Password" value={draftUser.password} onChange={(v) => setDraftUser({ ...draftUser, password: v })} />
                <EditInput label="Invite Code" value={draftUser.inviteCode} onChange={(v) => setDraftUser({ ...draftUser, inviteCode: v })} />
              </Grid2>
            </Box>

            <Box title="KYC Pictures">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <DocImage title="Front Side" src={draftApp.documents.idFrontDataUrl} fallback={draftApp.documents.idFrontName} onOpen={(title, src) => setDocPreview({ title, src })} />
                <DocImage title="Back Side" src={draftApp.documents.idBackDataUrl} fallback={draftApp.documents.idBackName} onOpen={(title, src) => setDocPreview({ title, src })} />
                <DocImage title="Selfie" src={draftApp.documents.selfieHoldingIdDataUrl} fallback={draftApp.documents.selfieHoldingIdName} onOpen={(title, src) => setDocPreview({ title, src })} />
              </div>
            </Box>

            <Box title="Address / Loan Information">
              <Grid2>
                <EditInput label="Applicant" value={draftApp.applicant.fullName} onChange={(v) => setDraftApp({ ...draftApp, applicant: { ...draftApp.applicant, fullName: v } })} />
                <EditInput label="ID Card Number" value={draftApp.applicant.idCardNumber} onChange={(v) => setDraftApp({ ...draftApp, applicant: { ...draftApp.applicant, idCardNumber: v } })} />
                <EditInput label="Date of Issue" value={draftApp.applicant.dateOfIssue} onChange={(v) => setDraftApp({ ...draftApp, applicant: { ...draftApp.applicant, dateOfIssue: v } })} />
                <EditInput label="Place of Issue" value={draftApp.applicant.placeOfIssue} onChange={(v) => setDraftApp({ ...draftApp, applicant: { ...draftApp.applicant, placeOfIssue: v } })} />
                <EditInput label="Current Address" value={draftApp.contact.currentAddress} onChange={(v) => setDraftApp({ ...draftApp, contact: { ...draftApp.contact, currentAddress: v } })} />
                <EditInput label="Current Job" value={draftApp.contact.currentJob} onChange={(v) => setDraftApp({ ...draftApp, contact: { ...draftApp.contact, currentJob: v } })} />
                <EditInput label="Work Address" value={draftApp.contact.workAddress} onChange={(v) => setDraftApp({ ...draftApp, contact: { ...draftApp.contact, workAddress: v } })} />
                <EditInput label="Position" value={draftApp.contact.position} onChange={(v) => setDraftApp({ ...draftApp, contact: { ...draftApp.contact, position: v } })} />
                <EditInput label="Monthly Income" value={draftApp.contact.monthlyIncome} onChange={(v) => setDraftApp({ ...draftApp, contact: { ...draftApp.contact, monthlyIncome: v } })} />
                <EditInput label="Loan Amount" value={String(draftApp.loan.amount)} onChange={(v) => setDraftApp({ ...draftApp, loan: { ...draftApp.loan, amount: Number(v) || 0 } })} />
                <EditInput label="Interest Rate (%)" value={String(draftApp.loan.interestRate)} onChange={(v) => setDraftApp({ ...draftApp, loan: { ...draftApp.loan, interestRate: Number(v) || 0 } })} />
                <EditInput label="Loan Term (months)" value={String(draftApp.loan.termMonths)} onChange={(v) => setDraftApp({ ...draftApp, loan: { ...draftApp.loan, termMonths: Number(v) || 0 } })} />
                <EditInput label="Current Balance" value={balanceInput} onChange={(v) => setBalanceInput(v)} />
                <EditInput label="Withdraw Code" value={draftApp.withdrawCode || ''} onChange={(v) => setDraftApp({ ...draftApp, withdrawCode: v })} />
              </Grid2>
            </Box>

            <Box title="Bank Information">
              <Grid2>
                <EditInput label="Bank Name" value={draftApp.bank.bankName} onChange={(v) => setDraftApp({ ...draftApp, bank: { ...draftApp.bank, bankName: v } })} />
                <EditInput label="Account Holder" value={draftApp.bank.accountHolderName} onChange={(v) => setDraftApp({ ...draftApp, bank: { ...draftApp.bank, accountHolderName: v } })} />
                <EditInput label="Account Number" value={draftApp.bank.accountNumber} onChange={(v) => setDraftApp({ ...draftApp, bank: { ...draftApp.bank, accountNumber: v } })} />
              </Grid2>
            </Box>

            <Box title="Signature">
              {draftApp.documents.signatureDataUrl ? (
                <button type="button" className="block" onClick={() => setDocPreview({ title: 'Signature', src: draftApp.documents.signatureDataUrl })}>
                  <img src={draftApp.documents.signatureDataUrl} alt="Signature" className="h-28 w-[360px] rounded border bg-white object-contain" />
                </button>
              ) : (
                <div className="text-sm text-slate-500">No signature</div>
              )}
            </Box>
          </div>
        </div>
      </div>

      <Modal open={!!docPreview} title={docPreview?.title} onClose={() => setDocPreview(null)} maxWidthClassName="max-w-3xl">
        {docPreview && <img src={docPreview.src} alt={docPreview.title} className="max-h-[70vh] w-full rounded-xl border bg-white object-contain" />}
      </Modal>
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded border border-slate-300">
      <div className="bg-slate-600 px-3 py-1 text-xs font-extrabold text-white">{title}</div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{children}</div>;
}

function EditInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-slate-700">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
  );
}

function DocImage({
  title,
  src,
  fallback,
  onOpen,
}: {
  title: string;
  src?: string;
  fallback?: string;
  onOpen: (title: string, src: string) => void;
}) {
  return (
    <div className="rounded border border-slate-300 bg-white p-2">
      <div className="mb-1 text-[11px] font-bold text-slate-700">{title}</div>
      {src ? (
        <button type="button" className="block w-full" onClick={() => onOpen(title, src)}>
          <img src={src} alt={title} className="h-24 w-full rounded border object-cover" />
        </button>
      ) : (
        <div className="text-xs text-slate-600">{fallback || '-'}</div>
      )}
    </div>
  );
}
