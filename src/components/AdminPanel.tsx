import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, KeyRound, Pencil, Users } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { AdminSupportChat } from './AdminSupportChat';
import { adminApi } from '../lib/api';
import {
  type Application,
  type LoanStatus,
  type User,
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

type Section = 'dashboard' | 'customers' | 'loans' | 'support' | 'agents';

const card = 'rounded-sm border border-slate-200 bg-white';
const field = 'h-9 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-[#0b4a90]';
const BLOCKED_NOTICE_KEY = 'take_easy_loan_blocked_notice';
const TERM_OPTIONS: number[] = [3, 6, 12, 24, 36, 48, 60, 90, 120];

export function AdminPanel({ onNavigate, onOpenEdit }: AdminPanelProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [section, setSection] = useState<Section>('dashboard');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [perPage, setPerPage] = useState(50);
  const [pinModalAppId, setPinModalAppId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
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

  const adminLoggedIn = useMemo(() => isAdminLoggedIn(), [refreshKey]);
  const dbSnapshot = useMemo(() => getDb(), [refreshKey]);
  const users = useMemo(() => Object.values(dbSnapshot.users), [dbSnapshot.users]);
  const apps = useMemo(
    () => Object.values(dbSnapshot.applications).sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0)),
    [dbSnapshot.applications],
  );

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
      const u = dbSnapshot.users[app.userId];
      if (!normalized) return true;
      const userText = `${u?.phoneOrEmail ?? ''} ${app.applicant.fullName}`.toLowerCase();
      return userText.includes(normalized);
    });
    return result.slice(0, perPage);
  }, [dbSnapshot.users, latestAppsPerUser, perPage, usernameFilter]);

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
      for (const u of overview.users) {
        upsertUser({
          id: u.id,
          gender: (u.gender as User['gender']) || 'Male',
          phoneOrEmail: u.phoneOrEmail,
          password: '',
          inviteCode: '',
          createdAt: u.createdAt,
          lastApplicationId: u.lastApplicationId,
          disabledLogin: false,
        });
      }
      for (const a of overview.applications) {
        upsertApplication(a as Application);
      }
      for (const [userId, balance] of Object.entries(overview.balances || {})) {
        setUserBalance(userId, balance);
      }
      setRefreshKey((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load admin data.');
    } finally {
      setSyncing(false);
    }
  };

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      const res = await adminApi.login({ username, password });
      setAdminPin(res.adminPin);
      setAdminSession(true);
      setPassword('');
      await syncFromServer(res.adminPin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid admin login.');
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) return;
    syncFromServer();
  }, [adminLoggedIn]);

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

    upsertApplication({
      ...app,
      loan: {
        ...app.loan,
        amount: Math.round(amount),
        termMonths,
        monthlyPayment,
        totalInterest,
        totalRepayment,
      },
    });
    setRefreshKey((x) => x + 1);
    setEditLoanAppId(null);
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
    upsertApplication({
      ...app,
      status: nextStatus,
      statusLabel: statusLabel.trim() || undefined,
      statusNote: statusNote.trim() || undefined,
      approvedAt: nextStatus === 'approved' ? Date.now() : undefined,
    });
    if (nextStatus === 'approved' && !wasApproved) {
      const b = getUserBalance(app.userId);
      setUserBalance(app.userId, {
        currentBalance: app.loan.amount,
        withdrawnAmount: b.withdrawnAmount,
      });
    }
    setRefreshKey((x) => x + 1);
    setStatusModalAppId(null);
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
    setUserBalance(adjustModalUserId, next);
    setRefreshKey((x) => x + 1);
    setAdjustAmount('');
  };

  const toggleDisableLogin = (userId: string) => {
    const db = getDb();
    const u = db.users[userId];
    if (!u) {
      setError('User record missing for this row.');
      return;
    }
    const willDisable = !u.disabledLogin;
    upsertUser({ ...u, disabledLogin: willDisable });
    const session = getSession();
    if (willDisable && session?.userId === userId) {
      setSession(null);
      localStorage.setItem(BLOCKED_NOTICE_KEY, 'Your account is blocked. Please contact customer service.');
    }
    setRefreshKey((x) => x + 1);
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
    upsertUser({ ...u, password: newPassword.trim() });
    setPasswordModalUserId(null);
    setNewPassword('');
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
  const totalAgents = 3;
  const totalSupport = 1;

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
            <SidebarItem label="Support" count={totalSupport} active={section === 'support'} onClick={() => setSection('support')} />
            <SidebarItem label="Agents" count={totalAgents} active={section === 'agents'} onClick={() => setSection('agents')} />
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="text-3xl font-light text-slate-500">≡</div>
            <div className="flex items-center gap-4 text-sm">
              {syncing && <span className="font-semibold text-slate-500">Syncing…</span>}
              <span className="font-semibold text-slate-500">Operator: Pablo</span>
              <Button className="h-8 rounded bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700" onClick={logout}>
                Logout
              </Button>
            </div>
          </header>

          <div className="p-4">
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
                        {['ID', 'Date', 'Account Code', 'Full Name', 'Reference', 'Agent', 'Withdrawal code', 'PIN Code', 'Actions'].map((h) => (
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
                        return (
                          <tr key={u.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{app?.bank?.accountNumber || '-'}</td>
                            <td className="px-3 py-2">{app?.applicant?.fullName || '-'}</td>
                            <td className="px-3 py-2">{u?.inviteCode || '-'}</td>
                            <td className="px-3 py-2">OM</td>
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
                                  upsertUser({ ...user, inviteCode: next });
                                  setRefreshKey((x) => x + 1);
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

            {section === 'agents' && (
              <div className={`${card} p-6 text-sm font-semibold text-slate-600`}>
                Agents module placeholder.
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
              onClick={() => {
                if (!pinModalAppId) return;
                const db = getDb();
                const app = db.applications[pinModalAppId];
                if (!app) return;
                upsertApplication({ ...app, withdrawCode: pinCode.trim() });
                setRefreshKey((x) => x + 1);
                setPinModalAppId(null);
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
            <div className="mb-1 text-xs font-bold text-slate-700">Loan Amount ($)</div>
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
