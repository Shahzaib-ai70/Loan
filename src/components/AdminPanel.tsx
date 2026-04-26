import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, KeyRound, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { AdminSupportChat } from './AdminSupportChat';
import { adminApi, applicationsApi, type AgentSummary, type Appointment } from '../lib/api';
import { formatMoney, useCurrency } from '../lib/currency';
import {
  type Application,
  type Balance,
  type LoanStatus,
  type User,
  applyAdminSnapshot,
  deleteUserLocal,
  getDb,
  getSession,
  getUserBalance,
  isAdminLoggedIn,
  setAdminPin,
  setAdminSession,
  setSession,
  setUserBalance,
  upsertApplication,
  upsertUser,
} from '../lib/db';

type AdminPanelProps = {
  onNavigate: (to: 'dashboard' | 'admin') => void;
  onOpenEdit: (appId: string) => void;
};

type Section = 'dashboard' | 'customers' | 'loans' | 'appointments' | 'support' | 'agents' | 'settings';

const card = 'rounded-sm border border-slate-200 bg-white';
const field = 'h-9 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-[#0b4a90]';
const BLOCKED_NOTICE_KEY = 'take_easy_loan_blocked_notice';
const ADMIN_SECTION_KEY = 'take_easy_loan_admin_section';
const TERM_OPTIONS: number[] = [3, 6, 12, 24, 36, 48, 60, 90, 120];
const OPERATOR_NAME_KEY = 'take_easy_loan_admin_operator_name';
const ADMIN_AUTO_REFRESH_KEY = 'take_easy_loan_admin_auto_refresh';
const SUPER_ADMIN_INVITE_CODE = '12345678';

const generateInviteCode = () => {
  const chars = '0123456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const readFileAsDataUrl = async (file: File): Promise<string> => {
  const readRaw = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(file);
    });

  if (!file.type.startsWith('image/')) return readRaw();

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image_load_failed'));
      el.src = objectUrl;
    });
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (!w || !h) return readRaw();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return readRaw();

    const MAX_LEN = 45_000;
    const TARGET_LEN = 40_000;
    const maxDims = [700, 560, 480, 400, 320];
    const qualities = [0.78, 0.7, 0.62, 0.56, 0.5];

    for (const maxDim of maxDims) {
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const q of qualities) {
        const dataUrl = canvas.toDataURL('image/jpeg', q);
        if (!dataUrl || dataUrl === 'data:,') continue;
        if (dataUrl.length <= TARGET_LEN) return dataUrl;
      }
    }

    const finalUrl = canvas.toDataURL('image/jpeg', 0.5);
    if (finalUrl && finalUrl !== 'data:,' && finalUrl.length <= MAX_LEN) return finalUrl;
    return readRaw();
  } catch {
    return readRaw();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const isSection = (value: string): value is Section =>
  ['dashboard', 'customers', 'loans', 'appointments', 'support', 'agents', 'settings'].includes(value);

export function AdminPanel({ onNavigate, onOpenEdit }: AdminPanelProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');
  const [pinLogin, setPinLogin] = useState('');
  const { showCurrencySign, currencySymbol, setShowCurrencySign, setCurrencySymbol } = useCurrency();
  const [operatorName, setOperatorName] = useState(() => {
    try {
      return localStorage.getItem(OPERATOR_NAME_KEY) || 'Admin';
    } catch {
      return 'Admin';
    }
  });
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [section, setSection] = useState<Section>(() => {
    try {
      const urlSection = new URLSearchParams(window.location.search).get('adminSection');
      if (urlSection && isSection(urlSection)) return urlSection;
      const raw = localStorage.getItem(ADMIN_SECTION_KEY);
      return raw && isSection(raw) ? raw : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [usernameFilter, setUsernameFilter] = useState('');
  const [perPage, setPerPage] = useState(50);
  const [pinModalAppId, setPinModalAppId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [withdrawErrorModalAppId, setWithdrawErrorModalAppId] = useState<string | null>(null);
  const [withdrawErrorEnabled, setWithdrawErrorEnabled] = useState(false);
  const [withdrawErrorText, setWithdrawErrorText] = useState('');
  const [withdrawErrorMedia, setWithdrawErrorMedia] = useState('');
  const [passwordModalUserId, setPasswordModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editLoanAppId, setEditLoanAppId] = useState<string | null>(null);
  const [editLoanAmount, setEditLoanAmount] = useState('');
  const [editLoanTermMonths, setEditLoanTermMonths] = useState(60);
  const [statusModalAppId, setStatusModalAppId] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState<LoanStatus>('under_review');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [adjustModalUserId, setAdjustModalUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentUsername, setAgentUsername] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentInviteCode, setAgentInviteCode] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [overviewUsers, setOverviewUsers] = useState<User[]>([]);
  const [overviewApps, setOverviewApps] = useState<Application[]>([]);
  const [overviewBalances, setOverviewBalances] = useState<Record<string, Balance>>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_AUTO_REFRESH_KEY) === '1';
    } catch {
      return false;
    }
  });

  const adminLoggedIn = useMemo(() => isAdminLoggedIn(), [refreshKey]);
  const dbSnapshot = useMemo(() => getDb(), [refreshKey]);
  const users = useMemo(() => {
    if (overviewUsers.length) return overviewUsers;
    return Object.values(dbSnapshot.users);
  }, [dbSnapshot.users, overviewUsers]);
  const apps = useMemo(() => {
    const base = overviewApps.length ? overviewApps : Object.values(dbSnapshot.applications);
    return base.slice().sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
  }, [dbSnapshot.applications, overviewApps]);

  const balances = useMemo(() => {
    if (Object.keys(overviewBalances).length) return overviewBalances;
    return dbSnapshot.balances || {};
  }, [dbSnapshot.balances, overviewBalances]);

  const userById = useMemo(() => {
    const map: Record<string, User> = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);

  const appById = useMemo(() => {
    const map: Record<string, Application> = {};
    for (const a of apps) map[a.id] = a;
    return map;
  }, [apps]);

  const latestAppsPerUser = useMemo(() => {
    const seen = new Set<string>();
    const list: Application[] = [];
    for (const app of apps) {
      const userId = (app as unknown as { userId?: string }).userId;
      if (!userId) continue;
      if (seen.has(userId)) continue;
      seen.add(userId);
      list.push(app);
    }
    return list;
  }, [apps]);

  const latestAppByUserId = useMemo(() => {
    const map: Record<string, Application> = {};
    for (const app of latestAppsPerUser) map[app.userId] = app;
    return map;
  }, [latestAppsPerUser]);

  const filteredApps = useMemo(() => {
    const normalized = usernameFilter.trim().toLowerCase();
    const result = latestAppsPerUser.filter((app) => {
      const u = userById[app.userId];
      if (!normalized) return true;
      const userText = `${u?.phoneOrEmail ?? ''} ${app.applicant.fullName}`.toLowerCase();
      return userText.includes(normalized);
    });
    return result.slice(0, perPage);
  }, [latestAppsPerUser, perPage, userById, usernameFilter]);

  const currencyOptions = useMemo(
    () => [
      { label: 'USD ($)', value: '$' },
      { label: 'EUR (€)', value: '€' },
      { label: 'GBP (£)', value: '£' },
      { label: 'JPY (¥)', value: '¥' },
      { label: 'CNY (¥)', value: '¥' },
      { label: 'INR (₹)', value: '₹' },
      { label: 'KRW (₩)', value: '₩' },
      { label: 'RUB (₽)', value: '₽' },
      { label: 'TRY (₺)', value: '₺' },
      { label: 'ILS (₪)', value: '₪' },
      { label: 'THB (฿)', value: '฿' },
      { label: 'PHP (₱)', value: '₱' },
      { label: 'NGN (₦)', value: '₦' },
      { label: 'VND (₫)', value: '₫' },
    ],
    [],
  );

  const saveAppSettings = async (nextEnabled: boolean, nextSymbol: string) => {
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) {
      setError('Admin session expired. Please logout and login again.');
      return;
    }
    setError('');
    try {
      const res = await adminApi.updateAppSettings(adminPin, { currencySignEnabled: nextEnabled, currencySymbol: nextSymbol });
      setShowCurrencySign(!!res.settings.currencySignEnabled);
      setCurrencySymbol(res.settings.currencySymbol);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update settings.');
    }
  };

  const filteredUsers = useMemo(() => {
    const normalized = usernameFilter.trim().toLowerCase();
    const list = users
      .slice()
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .filter((u) => {
        if (!normalized) return true;
        const app = latestAppByUserId[u.id];
        const text = `${u.phoneOrEmail ?? ''} ${app?.applicant?.fullName ?? ''}`.toLowerCase();
        return text.includes(normalized);
      });
    return list.slice(0, perPage);
  }, [latestAppByUserId, perPage, usernameFilter, users]);

  const filteredAgents = useMemo(() => {
    const normalized = agentSearch.trim().toLowerCase();
    if (!normalized) return agents;
    return agents.filter((a) => `${a.username} ${a.inviteCode}`.toLowerCase().includes(normalized));
  }, [agentSearch, agents]);

  const editLoanPreview = useMemo(() => {
    if (!editLoanAppId) return null;
    const app = dbSnapshot.applications[editLoanAppId];
    if (!app) return null;
    const amount = Number(String(editLoanAmount).replace(/[^\d.]/g, ''));
    const termMonths = Number(editLoanTermMonths) || 0;
    const interestRate = Number(app.loan.interestRate) || 0;
    if (!Number.isFinite(amount) || amount <= 0 || !termMonths) {
      return { interestRate, totalInterest: 0, totalRepayment: 0, monthlyPayment: 0 };
    }
    const totalInterest = amount * (interestRate / 100);
    const totalRepayment = amount + totalInterest;
    const monthlyPayment = totalRepayment / termMonths;
    return { interestRate, totalInterest, totalRepayment, monthlyPayment };
  }, [dbSnapshot.applications, editLoanAmount, editLoanAppId, editLoanTermMonths]);

  const agentNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.username;
    return map;
  }, [agents]);

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

  const syncFromServer = async (pinValue?: string) => {
    const adminPin = (pinValue ?? getDb().admin.pin).trim();
    if (!adminPin) return;
    setSyncing(true);
    setError('');
    try {
      const overview = await adminApi.getOverview(adminPin);
      const nextUsers: User[] = (overview.users || []).map((u) => ({
        id: u.id,
        gender: (u.gender as User['gender']) || 'Male',
        phoneOrEmail: u.phoneOrEmail,
        password: '',
        inviteCode: u.inviteCode || '',
        agentId: u.agentId,
        createdAt: u.createdAt,
        lastApplicationId: u.lastApplicationId,
        disabledLogin: !!u.disabledLogin,
      }));
      const nextApps = (overview.applications || []) as Application[];
      const nextBalances = (overview.balances || {}) as Record<string, Balance>;
      setOverviewUsers(nextUsers);
      setOverviewApps(nextApps);
      setOverviewBalances(nextBalances);
      setLastSyncAt(Date.now());
      try {
        applyAdminSnapshot({ users: nextUsers, applications: nextApps, balances: nextBalances });
      } catch {
      }
      setRefreshKey((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load admin data.');
    } finally {
      setSyncing(false);
    }
  };

  const loadAgents = async () => {
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    setAgentsLoading(true);
    setError('');
    try {
      const res = await adminApi.getAgents(adminPin);
      setAgents(res.agents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load agents.');
    } finally {
      setAgentsLoading(false);
    }
  };

  const loadAppointments = async () => {
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    setAppointmentsLoading(true);
    setError('');
    try {
      const res = await adminApi.getAppointments(adminPin);
      setAppointments(res.appointments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load appointments.');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const createAgent = async () => {
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    const u = agentUsername.trim();
    const p = agentPassword;
    const inv = agentInviteCode.trim() || generateInviteCode();
    if (!u || !p) {
      setError('Username and password are required.');
      return;
    }
    setAgentsLoading(true);
    setError('');
    try {
      await adminApi.createAgent(adminPin, { username: u, password: p, inviteCode: inv });
      setAgentModalOpen(false);
      setAgentUsername('');
      setAgentPassword('');
      setAgentInviteCode('');
      await loadAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create agent.');
    } finally {
      setAgentsLoading(false);
    }
  };

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (loginLoading) return;
    if (loginMode === 'pin') {
      const p = pinLogin.trim();
      if (p.length !== 6) {
        setError('PIN is required.');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError('Username and password are required.');
        return;
      }
    }
    setLoginLoading(true);
    try {
      const res =
        loginMode === 'pin'
          ? await adminApi.login({ pin: pinLogin.trim() })
          : await adminApi.login({ username, password });
      setAdminPin(res.adminPin);
      setAdminSession(true);
      setRefreshKey((x) => x + 1);
      try {
        const nextOp = loginMode === 'password' ? username.trim() || 'Admin' : 'Admin';
        localStorage.setItem(OPERATOR_NAME_KEY, nextOp);
        setOperatorName(nextOp);
      } catch {
      }
      setPassword('');
      setPinLogin('');
      await syncFromServer(res.adminPin);
      await loadAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid admin login.');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) return;
    syncFromServer();
    if (section === 'agents') loadAgents();
    if (section === 'appointments') loadAppointments();
  }, [adminLoggedIn]);

  useEffect(() => {
    if (!adminLoggedIn) return;
    try {
      localStorage.setItem(ADMIN_AUTO_REFRESH_KEY, autoRefreshEnabled ? '1' : '0');
    } catch {
    }
    if (!autoRefreshEnabled) return;
    const id = window.setInterval(() => {
      syncFromServer();
      if (section === 'agents') loadAgents();
      if (section === 'appointments') loadAppointments();
    }, 15000);
    return () => window.clearInterval(id);
  }, [adminLoggedIn, autoRefreshEnabled, section]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_SECTION_KEY, section);
      const url = new URL(window.location.href);
      url.searchParams.set('adminSection', section);
      window.history.replaceState({}, '', url.toString());
    } catch {
    }
  }, [section]);

  const logout = () => {
    setAdminSession(false);
    setRefreshKey((x) => x + 1);
  };

  const openEdit = (appId: string) => {
    const db = getDb();
    const app = db.applications[appId];
    if (!app) return;
    ensureUserForApp(app);
    onOpenEdit(appId);
  };

  const openEditLoan = (appId: string) => {
    const db = getDb();
    const app = db.applications[appId];
    if (!app) return;
    ensureUserForApp(app);
    setEditLoanAppId(appId);
    setEditLoanAmount(String(app.loan.amount ?? 0));
    setEditLoanTermMonths(app.loan.termMonths ?? 60);
  };

  const saveEditLoan = () => {
    if (!editLoanAppId) return;
    const db = getDb();
    const app = db.applications[editLoanAppId];
    if (!app) return;
    const amount = Number(String(editLoanAmount).replace(/[$,\s]/g, ''));
    const termMonths = Number(editLoanTermMonths) || 0;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!termMonths) return;

    const interestRate = Number(app.loan.interestRate) || 0;
    const totalInterest = amount * (interestRate / 100);
    const totalRepayment = amount + totalInterest;
    const monthlyPayment = termMonths ? totalRepayment / termMonths : 0;

    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    const nextApp = {
      ...app,
      loan: {
        ...app.loan,
        amount: Math.round(amount),
        termMonths,
        monthlyPayment,
        totalInterest,
        totalRepayment,
      },
    };
    setError('');
    adminApi
      .updateApplication(adminPin, editLoanAppId, { loan: nextApp.loan })
      .then((res) => {
        upsertApplication(res.application as Application);
        return syncFromServer(adminPin);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to save loan.');
      })
      .finally(() => {
        setEditLoanAppId(null);
      });
  };

  const openStatusModal = (appId: string) => {
    const db = getDb();
    const app = db.applications[appId];
    if (!app) return;
    ensureUserForApp(app);
    setStatusModalAppId(appId);
    setStatusValue(app.status);
    setStatusLabel(app.statusLabel ?? '');
    setStatusNote(app.statusNote ?? '');
  };

  const saveStatus = () => {
    if (!statusModalAppId) return;
    const db = getDb();
    const app = db.applications[statusModalAppId];
    if (!app) return;
    const nextStatus = statusValue;
    const wasApproved = app.status === 'approved';
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    const patch = {
      status: nextStatus,
      statusLabel: statusLabel.trim() || undefined,
      statusNote: statusNote.trim() || undefined,
      approvedAt: nextStatus === 'approved' ? Date.now() : undefined,
    };
    setError('');
    adminApi
      .updateApplication(adminPin, statusModalAppId, patch)
      .then(async (res) => {
        upsertApplication(res.application as Application);
        if (nextStatus === 'approved' && !wasApproved) {
          await adminApi.setUserBalance(adminPin, app.userId, Number(app.loan.amount) || 0);
        }
        await syncFromServer(adminPin);
        setStatusModalAppId(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to update status.');
      });
  };

  const openAdjustModal = (userId: string) => {
    setAdjustModalUserId(userId);
    setAdjustAmount('');
  };

  const applyAdjust = () => {
    if (!adjustModalUserId) return;
    const delta = Number(String(adjustAmount).replace(/[$,\s]/g, ''));
    if (!Number.isFinite(delta) || !delta) return;
    const b = getUserBalance(adjustModalUserId);
    const next = {
      currentBalance: Math.max(0, b.currentBalance + delta),
      withdrawnAmount: b.withdrawnAmount,
    };
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) return;
    setError('');
    adminApi
      .setUserBalance(adminPin, adjustModalUserId, next.currentBalance)
      .then(() => {
        setUserBalance(adjustModalUserId, next);
        setRefreshKey((x) => x + 1);
        setAdjustAmount('');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to update balance.');
      });
  };

  const toggleDisableLogin = (userId: string) => {
    const db = getDb();
    const u = db.users[userId];
    if (!u) {
      setError('User record missing for this row.');
      return;
    }
    const willDisable = !u.disabledLogin;
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) {
      setError('Admin session expired. Please logout and login again.');
      return;
    }
    setError('');
    adminApi
      .updateUser(adminPin, userId, { disabledLogin: willDisable })
      .then(() => syncFromServer(adminPin))
      .then(() => {
        const next = getDb().users[userId];
        if (next) upsertUser({ ...next, disabledLogin: willDisable });
        setRefreshKey((x) => x + 1);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to update user.');
      });
    const session = getSession();
    if (willDisable && session?.userId === userId) {
      setSession(null);
      localStorage.setItem(BLOCKED_NOTICE_KEY, 'Your account is blocked. Please contact customer service.');
    }
  };

  const updatePassword = () => {
    if (!passwordModalUserId) return;
    if (!newPassword.trim()) return;
    const db = getDb();
    const u = db.users[passwordModalUserId];
    if (!u) {
      setError('User record missing for password update.');
      return;
    }
    const adminPin = getDb().admin.pin.trim();
    if (!adminPin) {
      setError('Admin session expired. Please logout and login again.');
      return;
    }
    setError('');
    adminApi
      .updateUser(adminPin, passwordModalUserId, { password: newPassword.trim() })
      .then(() => {
        upsertUser({ ...u, password: newPassword.trim() });
        setPasswordModalUserId(null);
        setNewPassword('');
        setRefreshKey((x) => x + 1);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to update password.');
      });
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={loginMode === 'password' ? 'primary' : 'outline'}
                className={loginMode === 'password' ? 'h-10 w-full bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]' : 'h-10 w-full text-sm font-extrabold'}
                onClick={() => setLoginMode('password')}
              >
                Username/Password
              </Button>
              <Button
                type="button"
                variant={loginMode === 'pin' ? 'primary' : 'outline'}
                className={loginMode === 'pin' ? 'h-10 w-full bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]' : 'h-10 w-full text-sm font-extrabold'}
                onClick={() => setLoginMode('pin')}
              >
                PIN
              </Button>
            </div>

            {loginMode === 'password' ? (
              <>
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
              </>
            ) : (
              <input
                value={pinLogin}
                onChange={(e) => setPinLogin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit PIN"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
            )}
            <Button type="submit" className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]">
              Login
            </Button>
            <Button type="button" variant="outline" className="h-11 w-full rounded-lg text-sm font-extrabold" onClick={() => onNavigate('dashboard')}>
              Back
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const totalCustomers = users.length;
  const totalLoans = apps.length;
  const totalAgents = agents.length;
  const totalSupport = 1;
  const totalAppointments = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f7fa]">
      <div className="flex">
        <aside className="w-[210px] border-r border-slate-200 bg-white">
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
            <div className="h-8 w-8 rounded-full bg-cyan-500" />
            <div className="text-lg font-semibold text-slate-700">Loan App</div>
          </div>
          <nav className="p-2">
            <SidebarItem label="Customers" count={totalCustomers} active={section === 'customers'} onClick={() => setSection('customers')} />
            <SidebarItem label="Loan List" count={totalLoans} active={section === 'loans'} onClick={() => setSection('loans')} />
            <SidebarItem label="Appointments" count={totalAppointments} active={section === 'appointments'} onClick={() => setSection('appointments')} />
            <SidebarItem label="Support" count={totalSupport} active={section === 'support'} onClick={() => setSection('support')} />
            <SidebarItem label="Agents" count={totalAgents} active={section === 'agents'} onClick={() => setSection('agents')} />
            <SidebarItem label="Settings" count={0} active={section === 'settings'} onClick={() => setSection('settings')} />
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="text-3xl font-light text-slate-500">≡</div>
            <div className="flex items-center gap-4 text-sm">
              {syncing && <span className="font-semibold text-slate-500">Syncing…</span>}
              <span className="font-semibold text-slate-500">
                Last Sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : '—'}
              </span>
              <label className="flex items-center gap-2 font-semibold text-slate-500">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                />
                Auto Refresh
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded px-3 text-xs font-bold"
                onClick={() => {
                  syncFromServer();
                  if (section === 'agents') loadAgents();
                  if (section === 'appointments') loadAppointments();
                }}
              >
                Refresh
              </Button>
              <span className="font-semibold text-slate-500">Operator: {operatorName || 'Admin'}</span>
              <Button className="h-8 rounded bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700" onClick={logout}>
                Logout
              </Button>
            </div>
          </header>

          <div className="p-4">
            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {section === 'dashboard' && (
              <>
                <h2 className="mb-3 text-4xl font-semibold text-slate-800">Dashboard</h2>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <StatCard title={String(totalCustomers)} subtitle="Total My Customers" color="bg-blue-500" />
                  <StatCard title={String(totalLoans)} subtitle="Total Loan Applications" color="bg-green-600" />
                  <StatCard title={String(totalAgents)} subtitle="Total Agents Under Me" color="bg-cyan-600" />
                </div>
              </>
            )}

            {section === 'customers' && (
              <div className={`${card} p-4`}>
                <h2 className="text-4xl font-semibold text-slate-800">Customer List</h2>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_auto_auto]">
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-700">Username</div>
                    <input className={field} value={usernameFilter} onChange={(e) => setUsernameFilter(e.target.value)} placeholder="Enter username" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-700">Per Page</div>
                    <select className={field} value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="mt-5 h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700" onClick={() => setRefreshKey((x) => x + 1)}>
                    Filter
                  </Button>
                  <Button variant="outline" className="mt-5 h-9 rounded px-4 text-xs font-bold" onClick={() => { setUsernameFilter(''); setPerPage(50); }}>
                    Reset
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1200px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {['ID', 'Date', 'Login (Phone/Email)', 'Account Code', 'Full Name', 'Reference', 'Agent', 'Withdrawal code', 'PIN Code', 'Actions'].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => {
                        const app = latestAppByUserId[u.id];
                        const rowId = Number(String(u.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const date = new Date(u.createdAt).toLocaleDateString();
                        const code = app?.withdrawCode || '';
                        const agentName =
                          u.agentId
                            ? agentNameById[u.agentId] || '-'
                            : String(u.inviteCode || '').trim().toLowerCase() === SUPER_ADMIN_INVITE_CODE.toLowerCase()
                              ? 'Super Admin'
                              : '-';
                        return (
                          <tr key={u.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{u.phoneOrEmail || '-'}</td>
                            <td className="px-3 py-2">{app?.bank?.accountNumber || '-'}</td>
                            <td className="px-3 py-2">{app?.applicant?.fullName || '-'}</td>
                            <td className="px-3 py-2">{u?.inviteCode || '-'}</td>
                            <td className="px-3 py-2">{agentName}</td>
                            <td className="px-3 py-2">
                              {app ? (
                                <Button
                                  className="h-8 rounded bg-slate-200 px-3 text-xs font-bold text-slate-800 hover:bg-slate-300"
                                  onClick={() => {
                                    setPinModalAppId(app.id);
                                    setPinCode(code);
                                  }}
                                >
                                  PIN Code
                                </Button>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{code || '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {app && (
                                  <Button type="button" className="h-8 rounded bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700" onClick={() => openEdit(app.id)}>
                                    <Eye className="mr-1 h-3 w-3" /> View/Edit
                                  </Button>
                                )}
                                <Button type="button" className="h-8 rounded bg-slate-600 px-2 text-xs font-bold text-white hover:bg-slate-700" onClick={() => {
                                  const db = getDb();
                                  const user = db.users[u.id];
                                  if (!user) return;
                                  const next = prompt('Enter new invite code', user.inviteCode || '') ?? user.inviteCode;
                                  const adminPin = getDb().admin.pin.trim();
                                  if (!adminPin) return;
                                  adminApi.updateUser(adminPin, u.id, { inviteCode: next })
                                    .then(() => syncFromServer(adminPin))
                                    .then(() => setRefreshKey((x) => x + 1))
                                    .catch((e) => setError(e instanceof Error ? e.message : 'Unable to update invite code.'));
                                }}>
                                  <KeyRound className="mr-1 h-3 w-3" /> Edit Invite Code
                                </Button>
                                <Button type="button" className="h-8 rounded bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700" onClick={() => {
                                  setPasswordModalUserId(u.id);
                                  setNewPassword('');
                                }}>
                                  <KeyRound className="mr-1 h-3 w-3" /> Change Password
                                </Button>
                                <Button type="button" className="h-8 rounded bg-teal-600 px-2 text-xs font-bold text-white hover:bg-teal-700" onClick={() => toggleDisableLogin(u.id)}>
                                  <Users className="mr-1 h-3 w-3" /> {u?.disabledLogin ? 'Enable Login' : 'Disable Login'}
                                </Button>
                                {app && (
                                  <Button
                                    type="button"
                                    className="h-8 rounded bg-amber-600 px-2 text-xs font-bold text-white hover:bg-amber-700"
                                    onClick={() => {
                                      setError('');
                                      setWithdrawErrorModalAppId(app.id);
                                      const v = String(app.withdrawError || '');
                                      const media = String(app.withdrawErrorMedia || '');
                                      setWithdrawErrorEnabled(!!v.trim());
                                      setWithdrawErrorText(v);
                                      setWithdrawErrorMedia(media);
                                    }}
                                  >
                                    <Pencil className="mr-1 h-3 w-3" /> Withdraw Error
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700"
                                  onClick={async () => {
                                    const yes = window.confirm('Delete this user and all related details?');
                                    if (!yes) return;
                                    const adminPin = getDb().admin.pin.trim();
                                    if (!adminPin) {
                                      setError('Admin session expired. Please logout and login again.');
                                      return;
                                    }
                                    setError('');
                                    try {
                                      await adminApi.deleteUser(adminPin, u.id);
                                      deleteUserLocal(u.id);
                                      await syncFromServer(adminPin);
                                      setRefreshKey((x) => x + 1);
                                    } catch (e) {
                                      setError(e instanceof Error ? e.message : 'Unable to delete user.');
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'loans' && (
              <div className={`${card} p-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-semibold text-slate-800">Loan Orders</h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_auto_auto]">
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-700">Username</div>
                    <input className={field} value={usernameFilter} onChange={(e) => setUsernameFilter(e.target.value)} placeholder="Enter username" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-700">Per Page</div>
                    <select className={field} value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="mt-5 h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700" onClick={() => setRefreshKey((x) => x + 1)}>
                    Filter
                  </Button>
                  <Button variant="outline" className="mt-5 h-9 rounded px-4 text-xs font-bold" onClick={() => { setUsernameFilter(''); setPerPage(50); }}>
                    Reset
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1400px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {[
                          'ID',
                          'Order Number',
                          'Date',
                          'User',
                          'Agent',
                          'Invite Code',
                          'Balance',
                          'Withdrawn',
                          'Registered Amount',
                          'Term (Months)',
                          'Status',
                          'Actions',
                        ].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map((app, idx) => {
                        const u = dbSnapshot.users[app.userId];
                        const rowId = Number(String(app.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const orderNo = String(app.id).replace('APP-', '');
                        const date = new Date(app.submittedAt).toLocaleString();
                        const bal = getUserBalance(app.userId);
                        const statusText = app.statusLabel || (app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Under Review');
                        return (
                          <tr key={app.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{orderNo}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{u?.phoneOrEmail || app.applicant.fullName || '-'}</td>
                            <td className="px-3 py-2">OM</td>
                            <td className="px-3 py-2">{u?.inviteCode || '-'}</td>
                            <td className="px-3 py-2">{bal.currentBalance.toLocaleString()}</td>
                            <td className="px-3 py-2">{bal.withdrawnAmount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app.loan.amount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app.loan.termMonths}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${
                                app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" className="h-8 rounded bg-cyan-600 px-2 text-xs font-bold text-white hover:bg-cyan-700" onClick={() => openEditLoan(app.id)}>
                                  <Pencil className="mr-1 h-3 w-3" /> Edit
                                </Button>
                                <Button type="button" className="h-8 rounded bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700" onClick={() => openStatusModal(app.id)}>
                                  Change Status
                                </Button>
                                <Button type="button" className="h-8 rounded bg-amber-500 px-2 text-xs font-bold text-white hover:bg-amber-600" onClick={() => openAdjustModal(app.userId)}>
                                  Add/Subtract
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'appointments' && (
              <div className={`${card} p-4`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-4xl font-semibold text-slate-800">Appointments</h2>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Deposit appointment requests from customers.</div>
                  </div>
                  <Button
                    type="button"
                    className="h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
                    onClick={loadAppointments}
                    disabled={appointmentsLoading}
                  >
                    {appointmentsLoading ? 'Loading…' : 'Refresh'}
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1200px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {['ID', 'Date', 'User', 'Name', 'Amount', 'Appointment Date', 'Time', 'Location', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a, idx) => {
                        const rowId = Number(String(a.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const created = new Date(a.createdAt).toLocaleString();
                        const statusText = a.status === 'accepted' ? 'Accepted' : a.status === 'rejected' ? 'Rejected' : 'Pending';
                        return (
                          <tr key={a.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{created}</td>
                            <td className="px-3 py-2">{a.phoneOrEmail || '-'}</td>
                            <td className="px-3 py-2">{a.name || '-'}</td>
                            <td className="px-3 py-2">{a.amount || '-'}</td>
                            <td className="px-3 py-2">{a.date || '-'}</td>
                            <td className="px-3 py-2">{a.time || '-'}</td>
                            <td className="px-3 py-2">{a.location || '-'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded px-2 py-1 text-xs font-bold ${
                                  a.status === 'accepted'
                                    ? 'bg-green-100 text-green-700'
                                    : a.status === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {statusText}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-green-600 px-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={a.status !== 'pending'}
                                  onClick={async () => {
                                    const adminPin = getDb().admin.pin.trim();
                                    if (!adminPin) return;
                                    const note = window.prompt('Optional note for customer', '') ?? '';
                                    setError('');
                                    try {
                                      await adminApi.decideAppointment(adminPin, a.id, { status: 'accepted', note });
                                      await loadAppointments();
                                    } catch (e) {
                                      setError(e instanceof Error ? e.message : 'Unable to accept appointment.');
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={a.status !== 'pending'}
                                  onClick={async () => {
                                    const adminPin = getDb().admin.pin.trim();
                                    if (!adminPin) return;
                                    const note = window.prompt('Optional note for customer', '') ?? '';
                                    setError('');
                                    try {
                                      await adminApi.decideAppointment(adminPin, a.id, { status: 'rejected', note });
                                      await loadAppointments();
                                    } catch (e) {
                                      setError(e instanceof Error ? e.message : 'Unable to reject appointment.');
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!appointments.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={10}>
                            No appointments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'agents' && (
              <div className={`${card} p-4`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-4xl font-semibold text-slate-800">Agents</h2>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Create agents and manage invitation codes.</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Super Admin Invite Code: {SUPER_ADMIN_INVITE_CODE}</div>
                  </div>
                  <Button
                    type="button"
                    className="h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
                    onClick={() => {
                      setAgentModalOpen(true);
                      setAgentUsername('');
                      setAgentPassword('');
                      setAgentInviteCode(generateInviteCode());
                    }}
                  >
                    Add Agent
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_auto_auto]">
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-700">Search</div>
                    <input className={field} value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Search agent" />
                  </div>
                  <Button
                    type="button"
                    className="mt-5 h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
                    onClick={loadAgents}
                    disabled={agentsLoading}
                  >
                    {agentsLoading ? 'Loading…' : 'Refresh'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 h-9 rounded px-4 text-xs font-bold"
                    onClick={() => setAgentSearch('')}
                  >
                    Reset
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1200px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {['ID', 'Date', 'Username', 'Password', 'Invite Code', 'Total Customers'].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((a, idx) => {
                        const rowId = Number(String(a.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const date = new Date(a.createdAt).toLocaleString();
                        return (
                          <tr key={a.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{a.username}</td>
                            <td className="px-3 py-2">{a.password || '-'}</td>
                            <td className="px-3 py-2 font-semibold">{a.inviteCode}</td>
                            <td className="px-3 py-2">{a.totalCustomers}</td>
                          </tr>
                        );
                      })}
                      {!filteredAgents.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={6}>
                            No agents found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'settings' && (
              <div className={`${card} p-4`}>
                <h2 className="text-4xl font-semibold text-slate-800">Settings</h2>
                <div className="mt-1 text-sm font-semibold text-slate-500">Currency sign control (customer side).</div>

                <div className="mt-5 max-w-xl space-y-3">
                  <div className="text-xs font-bold text-slate-700">Show currency sign ($)</div>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="radio"
                        name="currencySignAdmin"
                        checked={showCurrencySign}
                        onChange={() => {
                          setShowCurrencySign(true);
                          saveAppSettings(true, currencySymbol);
                        }}
                      />
                      ON
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="radio"
                        name="currencySignAdmin"
                        checked={!showCurrencySign}
                        onChange={() => {
                          setShowCurrencySign(false);
                          saveAppSettings(false, currencySymbol);
                        }}
                      />
                      OFF
                    </label>
                  </div>

                  <div className="pt-2">
                    <div className="mb-1 text-xs font-bold text-slate-700">Currency symbol</div>
                    <select
                      className={field}
                      value={currencySymbol}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCurrencySymbol(next);
                        saveAppSettings(showCurrencySign, next);
                      }}
                    >
                      {currencyOptions.map((o) => (
                        <option key={o.label} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {section === 'support' && (
              <AdminSupportChat adminPin={dbSnapshot.admin.pin} />
            )}

          </div>
        </main>
      </div>

      <Modal
        open={!!pinModalAppId}
        title="Change Withdrawal Code"
        onClose={() => setPinModalAppId(null)}
      >
        <div className="space-y-4">
          <div className="text-base font-semibold text-slate-800">Enter New Withdrawal Code (6 digits)</div>
          <input
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter code"
            className="h-11 w-full rounded border border-slate-300 px-3 text-lg outline-none focus:border-[#0b4a90]"
          />
          <div className="flex gap-2">
            <Button
              className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              onClick={async () => {
                if (!pinModalAppId) return;
                const nextCode = pinCode.trim();
                if (nextCode && nextCode.length !== 6) {
                  setError('Withdrawal code must be 6 digits.');
                  return;
                }
                const db = getDb();
                const app = db.applications[pinModalAppId];
                if (!app) return;
                const adminPin = getDb().admin.pin.trim();
                if (!adminPin) {
                  setError('Admin session expired. Please logout and login again.');
                  return;
                }
                setError('');
                try {
                  const res = await adminApi.updateApplication(adminPin, pinModalAppId, { withdrawCode: nextCode || undefined });
                  upsertApplication(res.application as Application);
                  await syncFromServer(adminPin);
                  setRefreshKey((x) => x + 1);
                  setPinModalAppId(null);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Unable to update withdrawal code.';
                  if (msg.toLowerCase().includes('application not found')) {
                    try {
                      const created = await applicationsApi.create({ ...app, withdrawCode: nextCode || undefined });
                      upsertApplication(created.application as Application);
                      await syncFromServer(adminPin);
                      setRefreshKey((x) => x + 1);
                      setPinModalAppId(null);
                      return;
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to create application on server.');
                      return;
                    }
                  }
                  setError(msg);
                }
              }}
            >
              Update
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setPinModalAppId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!withdrawErrorModalAppId}
        title="Withdraw Error Message"
        onClose={() => setWithdrawErrorModalAppId(null)}
        maxWidthClassName="max-w-xl"
      >
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-700">Write a message to show on the user Withdraw page.</div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="radio"
                name="withdrawErrorEnabled"
                checked={withdrawErrorEnabled}
                onChange={() => setWithdrawErrorEnabled(true)}
              />
              Yes (Show error)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="radio"
                name="withdrawErrorEnabled"
                checked={!withdrawErrorEnabled}
                onChange={() => setWithdrawErrorEnabled(false)}
              />
              No (No error)
            </label>
          </div>

          {withdrawErrorEnabled && (
            <>
              <textarea
                value={withdrawErrorText}
                onChange={(e) => setWithdrawErrorText(e.target.value)}
                placeholder="Example: Your account is under verification. Please contact customer service."
                className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0b4a90]"
              />
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-700">Attach Image (optional)</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await readFileAsDataUrl(file);
                      setWithdrawErrorMedia(String(dataUrl || ''));
                    } catch {
                      setError('Unable to read image.');
                    }
                  }}
                />
                {!!withdrawErrorMedia.trim() && (
                  <div className="space-y-2">
                    <img src={withdrawErrorMedia} alt="" className="max-h-64 w-full rounded-xl object-contain" />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded px-4 text-xs font-bold"
                      onClick={() => setWithdrawErrorMedia('')}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button
              className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              onClick={async () => {
                if (!withdrawErrorModalAppId) return;
                const adminPin = getDb().admin.pin.trim();
                if (!adminPin) {
                  setError('Admin session expired. Please logout and login again.');
                  return;
                }
                const db = getDb();
                const app = db.applications[withdrawErrorModalAppId];
                if (!app) {
                  setError('Application not found for this user.');
                  return;
                }
                setError('');
                try {
                  const msg = withdrawErrorEnabled ? withdrawErrorText.trim() : '';
                  const media = withdrawErrorEnabled ? withdrawErrorMedia.trim() : '';
                  if (withdrawErrorEnabled && !msg) {
                    setError('Please enter withdraw error message.');
                    return;
                  }
                  const res = await adminApi.updateApplication(adminPin, withdrawErrorModalAppId, { withdrawError: msg, withdrawErrorMedia: media });
                  upsertApplication(res.application as Application);
                  await syncFromServer(adminPin);
                  setRefreshKey((x) => x + 1);
                  setWithdrawErrorModalAppId(null);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Unable to update withdraw error.';
                  if (msg.toLowerCase().includes('application not found')) {
                    try {
                      const created = await applicationsApi.create({
                        ...app,
                        withdrawError: withdrawErrorEnabled ? withdrawErrorText.trim() : '',
                        withdrawErrorMedia: withdrawErrorEnabled ? withdrawErrorMedia.trim() : '',
                      });
                      upsertApplication(created.application as Application);
                      await syncFromServer(adminPin);
                      setRefreshKey((x) => x + 1);
                      setWithdrawErrorModalAppId(null);
                      return;
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to create application on server.');
                      return;
                    }
                  }
                  setError(msg);
                }
              }}
            >
              Update
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded px-4 text-sm font-bold"
              onClick={() => {
                setWithdrawErrorEnabled(false);
                setWithdrawErrorText('');
                setWithdrawErrorMedia('');
              }}
            >
              Clear
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setWithdrawErrorModalAppId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={agentModalOpen} title="Add Agent" onClose={() => setAgentModalOpen(false)}>
        <div className="space-y-4">
          <input
            value={agentUsername}
            onChange={(e) => setAgentUsername(e.target.value)}
            placeholder="Agent username"
            className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
          />
          <input
            value={agentPassword}
            onChange={(e) => setAgentPassword(e.target.value)}
            placeholder="Agent password"
            type="password"
            className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
          />
          <input
            value={agentInviteCode}
            readOnly
            placeholder="Invite code (auto)"
            className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
          />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={createAgent} disabled={agentsLoading}>
              {agentsLoading ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setAgentInviteCode(generateInviteCode())}>
              Regenerate
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setAgentModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!passwordModalUserId}
        title="Change Password"
        onClose={() => setPasswordModalUserId(null)}
      >
        <div className="space-y-4">
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="h-11 w-full rounded border border-slate-300 px-3 text-base outline-none focus:border-[#0b4a90]"
          />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={updatePassword}>
              Update
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setPasswordModalUserId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editLoanAppId} title="Edit Loan" onClose={() => setEditLoanAppId(null)}>
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-bold text-slate-700">Loan Amount{showCurrencySign ? ` (${currencySymbol})` : ''}</div>
            <input
              value={editLoanAmount}
              onChange={(e) => setEditLoanAmount(e.target.value)}
              className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
              placeholder="3000"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-slate-700">Loan Term (Months)</div>
            <select
              value={editLoanTermMonths}
              onChange={(e) => setEditLoanTermMonths(Number(e.target.value))}
              className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
            >
              {TERM_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} months</option>
              ))}
            </select>
          </div>
          {editLoanPreview && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Loan %:</span>
                <span className="font-extrabold text-slate-900">{editLoanPreview.interestRate}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-600">Monthly payment:</span>
                <span className="font-extrabold text-[#0b4a90]">{formatMoney(editLoanPreview.monthlyPayment, showCurrencySign, 2, currencySymbol)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-600">Total interest:</span>
                <span className="font-extrabold text-slate-900">{formatMoney(editLoanPreview.totalInterest, showCurrencySign, 2, currencySymbol)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-600">Total repayment:</span>
                <span className="font-extrabold text-slate-900">{formatMoney(editLoanPreview.totalRepayment, showCurrencySign, 2, currencySymbol)}</span>
              </div>
            </div>
          )}
          <Button className="h-11 w-full rounded bg-blue-600 text-sm font-extrabold text-white hover:bg-blue-700" onClick={saveEditLoan}>
            Submit
          </Button>
        </div>
      </Modal>

      <Modal open={!!statusModalAppId} title="Update Loan Status" onClose={() => setStatusModalAppId(null)}>
        <div className="space-y-4">
          <div className="space-y-2 text-sm font-semibold text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" checked={statusValue === 'approved'} onChange={() => setStatusValue('approved')} />
              Approved
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={statusValue === 'under_review'} onChange={() => setStatusValue('under_review')} />
              Under Review
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={statusValue === 'rejected'} onChange={() => setStatusValue('rejected')} />
              Rejected
            </label>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-slate-700">Status Title (optional)</div>
            <input value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]" placeholder="e.g. Loan Successful" />
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-slate-700">Status Note (optional)</div>
            <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0b4a90]" placeholder="Message shown to user..." />
          </div>
          <Button className="h-11 w-full rounded bg-blue-600 text-sm font-extrabold text-white hover:bg-blue-700" onClick={saveStatus}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={!!adjustModalUserId} title="Add/Subtract Amount" onClose={() => setAdjustModalUserId(null)}>
        <div className="space-y-4">
          {adjustModalUserId && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Balance:</span>
                <span className="font-extrabold text-green-700">${getUserBalance(adjustModalUserId).currentBalance.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-600">Withdrawn:</span>
                <span className="font-extrabold text-amber-700">${getUserBalance(adjustModalUserId).withdrawnAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 text-xs font-bold text-slate-700">Enter Amount</div>
            <input
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
              placeholder="100 or -100"
            />
            <div className="mt-1 text-xs font-semibold text-slate-500">Positive adds to balance, negative subtracts from balance.</div>
          </div>
          <Button className="h-11 w-full rounded bg-blue-600 text-sm font-extrabold text-white hover:bg-blue-700" onClick={applyAdjust}>
            Submit
          </Button>
        </div>
      </Modal>

    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex h-10 w-full items-center justify-between rounded-sm px-3 text-sm font-semibold ${
        active ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      <span>{label}</span>
      <span className={`rounded px-2 py-0.5 text-xs font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-green-500 text-white'}`}>
        {count}
      </span>
    </button>
  );
}

function StatCard({ title, subtitle, color }: { title: string; subtitle: string; color: string }) {
  return (
    <div className={`${color} rounded-sm p-3 text-white`}>
      <div className="text-4xl font-extrabold">{title}</div>
      <div className="text-sm font-semibold">{subtitle}</div>
      <div className="mt-2 border-t border-white/30 pt-1 text-center text-xs font-bold">View More</div>
    </div>
  );
}
