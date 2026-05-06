import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { agentApi } from '../lib/api';
import { type Application, type User } from '../lib/db';

type AgentPanelProps = {
  onNavigate: (to: 'dashboard') => void;
};

type Section = 'customers' | 'loans';

const card = 'rounded-sm border border-slate-200 bg-white';
const field = 'h-9 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-[#0b4a90]';
const AGENT_KEY_STORAGE = 'take_easy_loan_agent_key';

export function AgentPanel({ onNavigate }: AgentPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section>('customers');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(50);
  const [agentKey, setAgentKey] = useState(() => {
    try {
      return localStorage.getItem(AGENT_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [agent, setAgent] = useState<{ id: string; username: string; inviteCode: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [balances, setBalances] = useState<Record<string, { currentBalance: number; withdrawnAmount: number }>>({});
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editDraftUser, setEditDraftUser] = useState<User | null>(null);
  const [editDraftApp, setEditDraftApp] = useState<Application | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState('0');
  const [docPreview, setDocPreview] = useState<{ title: string; src: string } | null>(null);
  const [statusModalAppId, setStatusModalAppId] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState<Application['status']>('under_review');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [codeModalAppId, setCodeModalAppId] = useState<string | null>(null);
  const [withdrawCode, setWithdrawCode] = useState('');
  const [withdrawErrorModalAppId, setWithdrawErrorModalAppId] = useState<string | null>(null);
  const [withdrawErrorText, setWithdrawErrorText] = useState('');
  const [withdrawErrorMedia, setWithdrawErrorMedia] = useState('');
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const latestAppsPerUser = useMemo(() => {
    const sorted = apps.slice().sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
    const seen = new Set<string>();
    const list: Application[] = [];
    for (const app of sorted) {
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

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
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
  }, [latestAppByUserId, perPage, search, users]);

  const filteredApps = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const list = latestAppsPerUser.filter((app) => {
      const u = users.find((x) => x.id === app.userId);
      if (!normalized) return true;
      const text = `${u?.phoneOrEmail ?? ''} ${app?.applicant?.fullName ?? ''}`.toLowerCase();
      return text.includes(normalized);
    });
    return list.slice(0, perPage);
  }, [latestAppsPerUser, perPage, search, users]);

  const loadOverview = async (key: string) => {
    const k = key.trim();
    if (!k) return;
    setLoading(true);
    setError('');
    try {
      const res = await agentApi.getOverview(k);
      setAgent(res.agent);
      setUsers(res.users as unknown as User[]);
      setApps(res.applications as unknown as Application[]);
      setBalances(res.balances || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load agent data.');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (userId: string) => {
    const user = users.find((u) => u.id === userId) || null;
    const app = latestAppByUserId[userId] || null;
    if (!user || !app) {
      setError('User or application not found.');
      return;
    }
    setEditUserId(userId);
    setEditDraftUser({ ...user });
    setEditDraftApp({ ...app });
    setEditBalanceInput(String((balances[userId] || { currentBalance: 0 }).currentBalance || 0));
  };

  const saveEdit = async () => {
    if (!agentKey || !editUserId || !editDraftUser || !editDraftApp) return;
    setLoading(true);
    setError('');
    try {
      const userRes = await agentApi.updateUser(agentKey, editUserId, {
        gender: editDraftUser.gender,
        phoneOrEmail: editDraftUser.phoneOrEmail,
        password: editDraftUser.password,
        inviteCode: editDraftUser.inviteCode,
      });
      const appRes = await agentApi.updateApplication(agentKey, editDraftApp.id, editDraftApp);
      const nextBalance = Number(editBalanceInput) || 0;
      await agentApi.setUserBalance(agentKey, editUserId, nextBalance);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUserId
            ? {
                ...u,
                gender: userRes.user.gender as User['gender'],
                phoneOrEmail: userRes.user.phoneOrEmail,
                password: editDraftUser.password,
                inviteCode: userRes.user.inviteCode || editDraftUser.inviteCode,
              }
            : u,
        ),
      );
      setApps((prev) => prev.map((a) => (a.id === editDraftApp.id ? (appRes.application as Application) : a)));
      setBalances((prev) => ({
        ...prev,
        [editUserId]: {
          currentBalance: nextBalance,
          withdrawnAmount: prev[editUserId]?.withdrawnAmount || 0,
        },
      }));
      setEditUserId(null);
      setEditDraftUser(null);
      setEditDraftApp(null);
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!agentKey || !statusModalAppId) return;
    const app = apps.find((x) => x.id === statusModalAppId);
    if (!app) return;
    setLoading(true);
    setError('');
    try {
      const patch = {
        status: statusValue,
        statusLabel: statusLabel.trim() || undefined,
        statusNote: statusNote.trim() || undefined,
        approvedAt: statusValue === 'approved' ? Date.now() : undefined,
      };
      const res = await agentApi.updateApplication(agentKey, statusModalAppId, patch);
      if (statusValue === 'approved') {
        await agentApi.setUserBalance(agentKey, app.userId, Number((res.application as Application).loan?.amount || 0));
      }
      setStatusModalAppId(null);
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update status.');
    } finally {
      setLoading(false);
    }
  };

  const saveWithdrawCode = async () => {
    if (!agentKey || !codeModalAppId) return;
    if (withdrawCode.trim() && withdrawCode.trim().length !== 6) {
      setError('Withdrawal code must be 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await agentApi.updateApplication(agentKey, codeModalAppId, { withdrawCode: withdrawCode.trim() || undefined });
      setCodeModalAppId(null);
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update withdrawal code.');
    } finally {
      setLoading(false);
    }
  };

  const saveWithdrawError = async () => {
    if (!agentKey || !withdrawErrorModalAppId) return;
    setLoading(true);
    setError('');
    try {
      const text = String(withdrawErrorText || '').trim();
      const media = String(withdrawErrorMedia || '').trim();
      await agentApi.updateApplication(agentKey, withdrawErrorModalAppId, {
        withdrawError: text || undefined,
        withdrawErrorMedia: media || undefined,
      });
      setWithdrawErrorModalAppId(null);
      setWithdrawErrorText('');
      setWithdrawErrorMedia('');
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update withdraw error.');
    } finally {
      setLoading(false);
    }
  };

  const applyAdjust = async () => {
    if (!agentKey || !adjustUserId) return;
    const delta = Number(String(adjustAmount).replace(/[$,\s]/g, ''));
    if (!Number.isFinite(delta) || !delta) return;
    const bal = balances[adjustUserId] || { currentBalance: 0, withdrawnAmount: 0 };
    const next = Math.max(0, bal.currentBalance + delta);
    setLoading(true);
    setError('');
    try {
      await agentApi.setUserBalance(agentKey, adjustUserId, next);
      setAdjustUserId(null);
      setAdjustAmount('');
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update balance.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!agentKey) return;
    const yes = window.confirm('Delete this user and all related details?');
    if (!yes) return;
    setLoading(true);
    setError('');
    try {
      await agentApi.deleteUser(agentKey, userId);
      if (editUserId === userId) {
        setEditUserId(null);
        setEditDraftUser(null);
        setEditDraftApp(null);
      }
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete user.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDisableLogin = async (userId: string) => {
    if (!agentKey) return;
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const willDisable = !u.disabledLogin;
    setLoading(true);
    setError('');
    try {
      await agentApi.updateUser(agentKey, userId, { disabledLogin: willDisable });
      await loadOverview(agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update user.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!agentKey) return;
    loadOverview(agentKey);
  }, [agentKey]);

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await agentApi.login({ username, password });
      setAgentKey(res.agentKey);
      try {
        localStorage.setItem(AGENT_KEY_STORAGE, res.agentKey);
      } catch {
      }
      setPassword('');
      await loadOverview(res.agentKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid agent login.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAgentKey('');
    setAgent(null);
    setUsers([]);
    setApps([]);
    setBalances({});
    try {
      localStorage.removeItem(AGENT_KEY_STORAGE);
    } catch {
    }
  };

  if (!agentKey) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Agent Panel</h1>
          <p className="mt-1 text-sm text-slate-600">Login with your agent username and password.</p>
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
            <Button type="submit" className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
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

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f7fa]">
      <div className="flex">
        <aside className="w-[210px] border-r border-slate-200 bg-white">
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
            <div className="h-8 w-8 rounded-full bg-cyan-500" />
            <div className="text-lg font-semibold text-slate-700">Agent</div>
          </div>
          <nav className="p-2">
            <SidebarItem label="Customers" count={totalCustomers} active={section === 'customers'} onClick={() => setSection('customers')} />
            <SidebarItem label="Loan List" count={totalLoans} active={section === 'loans'} onClick={() => setSection('loans')} />
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="text-3xl font-light text-slate-500">≡</div>
            <div className="flex items-center gap-4 text-sm">
              {agent?.inviteCode && <span className="font-semibold text-slate-500">Invite: {agent.inviteCode}</span>}
              <span className="font-semibold text-slate-500">Agent: {agent?.username || '-'}</span>
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

            <div className={`${card} p-4`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-4xl font-semibold text-slate-800">{section === 'customers' ? 'Customer List' : 'Loan Orders'}</h2>
                <Button type="button" className="h-9 rounded bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700" onClick={() => loadOverview(agentKey)} disabled={loading}>
                  {loading ? 'Loading…' : 'Refresh'}
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
                <div>
                  <div className="mb-1 text-xs font-bold text-slate-700">Search</div>
                  <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter username" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold text-slate-700">Per Page</div>
                  <select className={field} value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" className="mt-5 h-9 rounded px-4 text-xs font-bold" onClick={() => { setSearch(''); setPerPage(50); }}>
                  Reset
                </Button>
              </div>

              {section === 'customers' && (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {['ID', 'Date', 'Username', 'Invite Code', 'Balance', 'Withdrawn', 'Status'].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => {
                        const app = latestAppByUserId[u.id];
                        const rowId = Number(String(u.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const date = new Date(u.createdAt).toLocaleString();
                        const bal = balances[u.id] || { currentBalance: 0, withdrawnAmount: 0 };
                        const statusText = app?.statusLabel || (app?.status === 'approved' ? 'Approved' : app?.status === 'rejected' ? 'Rejected' : 'Under Review');
                        return (
                          <tr key={u.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{u.phoneOrEmail}</td>
                            <td className="px-3 py-2">{u.inviteCode || '-'}</td>
                            <td className="px-3 py-2">{bal.currentBalance.toLocaleString()}</td>
                            <td className="px-3 py-2">{bal.withdrawnAmount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app ? statusText : '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {app && (
                                  <>
                                    <Button type="button" className="h-8 rounded bg-cyan-600 px-2 text-xs font-bold text-white hover:bg-cyan-700" onClick={() => openEdit(u.id)}>
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-amber-600 px-2 text-xs font-bold text-white hover:bg-amber-700"
                                      onClick={() => {
                                        setWithdrawErrorModalAppId(app.id);
                                        setWithdrawErrorText(app.withdrawError || '');
                                        setWithdrawErrorMedia(app.withdrawErrorMedia || '');
                                      }}
                                    >
                                      Withdraw Error
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700"
                                      onClick={() => {
                                        setStatusModalAppId(app.id);
                                        setStatusValue(app.status);
                                        setStatusLabel(app.statusLabel || '');
                                        setStatusNote(app.statusNote || '');
                                      }}
                                    >
                                      Status
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-slate-600 px-2 text-xs font-bold text-white hover:bg-slate-700"
                                      onClick={() => {
                                        setCodeModalAppId(app.id);
                                        setWithdrawCode(app.withdrawCode || '');
                                      }}
                                    >
                                      Code
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-amber-500 px-2 text-xs font-bold text-white hover:bg-amber-600"
                                      onClick={() => {
                                        setAdjustUserId(u.id);
                                        setAdjustAmount('');
                                      }}
                                    >
                                      Balance
                                    </Button>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-teal-600 px-2 text-xs font-bold text-white hover:bg-teal-700"
                                  onClick={() => toggleDisableLogin(u.id)}
                                  disabled={loading}
                                >
                                  {u.disabledLogin ? 'Enable Login' : 'Disable Login'}
                                </Button>
                                <Button type="button" className="h-8 rounded bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700" onClick={() => deleteUser(u.id)}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredUsers.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={8}>
                            No customers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {section === 'loans' && (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1200px] w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-slate-700">
                      <tr>
                        {['ID', 'Order Number', 'Date', 'User', 'Invite Code', 'Balance', 'Withdrawn', 'Registered Amount', 'Term (Months)', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map((app, idx) => {
                        const u = users.find((x) => x.id === app.userId);
                        const rowId = Number(String(app.id).replace(/\D/g, '').slice(-4) || idx + 1000);
                        const orderNo = String(app.id).replace('APP-', '');
                        const date = new Date(app.submittedAt).toLocaleString();
                        const statusText = app.statusLabel || (app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Under Review');
                        const bal = balances[app.userId] || { currentBalance: 0, withdrawnAmount: 0 };
                        return (
                          <tr key={app.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{orderNo}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{u?.phoneOrEmail || app.applicant.fullName || '-'}</td>
                            <td className="px-3 py-2">{u?.inviteCode || '-'}</td>
                            <td className="px-3 py-2">{bal.currentBalance.toLocaleString()}</td>
                            <td className="px-3 py-2">{bal.withdrawnAmount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app.loan.amount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app.loan.termMonths}</td>
                            <td className="px-3 py-2">{statusText}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-cyan-600 px-2 text-xs font-bold text-white hover:bg-cyan-700"
                                  onClick={() => openEdit(app.userId)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700"
                                  onClick={() => {
                                    setStatusModalAppId(app.id);
                                    setStatusValue(app.status);
                                    setStatusLabel(app.statusLabel || '');
                                    setStatusNote(app.statusNote || '');
                                  }}
                                >
                                  Change Status
                                </Button>
                                <Button
                                  type="button"
                                  className="h-8 rounded bg-amber-500 px-2 text-xs font-bold text-white hover:bg-amber-600"
                                  onClick={() => {
                                    setAdjustUserId(app.userId);
                                    setAdjustAmount('');
                                  }}
                                >
                                  Add/Subtract
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredApps.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={11}>
                            No loans found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal open={!!editUserId && !!editDraftUser && !!editDraftApp} title="Edit User" onClose={() => setEditUserId(null)} maxWidthClassName="max-w-5xl">
        {editDraftUser && editDraftApp && (
          <div className="space-y-4">
            <Grid2>
              <EditInput label="Username (Phone/Email)" value={editDraftUser.phoneOrEmail} onChange={(v) => setEditDraftUser({ ...editDraftUser, phoneOrEmail: v })} />
              <EditInput label="Gender" value={editDraftUser.gender} onChange={(v) => setEditDraftUser({ ...editDraftUser, gender: v as User['gender'] })} />
              <EditInput label="Password" value={editDraftUser.password} onChange={(v) => setEditDraftUser({ ...editDraftUser, password: v })} />
              <EditInput label="Invite Code" value={editDraftUser.inviteCode} onChange={(v) => setEditDraftUser({ ...editDraftUser, inviteCode: v })} />
              <EditInput label="Applicant" value={editDraftApp.applicant.fullName} onChange={(v) => setEditDraftApp({ ...editDraftApp, applicant: { ...editDraftApp.applicant, fullName: v } })} />
              <EditInput label="ID Card Number" value={editDraftApp.applicant.idCardNumber} onChange={(v) => setEditDraftApp({ ...editDraftApp, applicant: { ...editDraftApp.applicant, idCardNumber: v } })} />
              <EditInput label="Date of Issue" value={editDraftApp.applicant.dateOfIssue} onChange={(v) => setEditDraftApp({ ...editDraftApp, applicant: { ...editDraftApp.applicant, dateOfIssue: v } })} />
              <EditInput label="Place of Issue" value={editDraftApp.applicant.placeOfIssue} onChange={(v) => setEditDraftApp({ ...editDraftApp, applicant: { ...editDraftApp.applicant, placeOfIssue: v } })} />
              <EditInput label="Current Address" value={editDraftApp.contact.currentAddress} onChange={(v) => setEditDraftApp({ ...editDraftApp, contact: { ...editDraftApp.contact, currentAddress: v } })} />
              <EditInput label="Current Job" value={editDraftApp.contact.currentJob} onChange={(v) => setEditDraftApp({ ...editDraftApp, contact: { ...editDraftApp.contact, currentJob: v } })} />
              <EditInput label="Work Address" value={editDraftApp.contact.workAddress} onChange={(v) => setEditDraftApp({ ...editDraftApp, contact: { ...editDraftApp.contact, workAddress: v } })} />
              <EditInput label="Position" value={editDraftApp.contact.position} onChange={(v) => setEditDraftApp({ ...editDraftApp, contact: { ...editDraftApp.contact, position: v } })} />
              <EditInput label="Monthly Income" value={editDraftApp.contact.monthlyIncome} onChange={(v) => setEditDraftApp({ ...editDraftApp, contact: { ...editDraftApp.contact, monthlyIncome: v } })} />
              <EditInput label="Loan Amount" value={String(editDraftApp.loan.amount)} onChange={(v) => setEditDraftApp({ ...editDraftApp, loan: { ...editDraftApp.loan, amount: Number(v) || 0 } })} />
              <EditInput label="Interest Rate (%)" value={String(editDraftApp.loan.interestRate)} onChange={(v) => setEditDraftApp({ ...editDraftApp, loan: { ...editDraftApp.loan, interestRate: Number(v) || 0 } })} />
              <EditInput label="Loan Term (months)" value={String(editDraftApp.loan.termMonths)} onChange={(v) => setEditDraftApp({ ...editDraftApp, loan: { ...editDraftApp.loan, termMonths: Number(v) || 0 } })} />
              <EditInput label="Current Balance" value={editBalanceInput} onChange={setEditBalanceInput} />
              <EditInput label="Withdraw Code" value={editDraftApp.withdrawCode || ''} onChange={(v) => setEditDraftApp({ ...editDraftApp, withdrawCode: v })} />
              <EditInput label="Bank Name" value={editDraftApp.bank.bankName} onChange={(v) => setEditDraftApp({ ...editDraftApp, bank: { ...editDraftApp.bank, bankName: v } })} />
              <EditInput label="Account Holder" value={editDraftApp.bank.accountHolderName} onChange={(v) => setEditDraftApp({ ...editDraftApp, bank: { ...editDraftApp.bank, accountHolderName: v } })} />
              <EditInput label="Account Number" value={editDraftApp.bank.accountNumber} onChange={(v) => setEditDraftApp({ ...editDraftApp, bank: { ...editDraftApp.bank, accountNumber: v } })} />
            </Grid2>

            <Box title="KYC Pictures">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <DocImage title="Front Side" src={editDraftApp.documents.idFrontDataUrl} fallback={editDraftApp.documents.idFrontName} onOpen={(title, src) => setDocPreview({ title, src })} />
                <DocImage title="Back Side" src={editDraftApp.documents.idBackDataUrl} fallback={editDraftApp.documents.idBackName} onOpen={(title, src) => setDocPreview({ title, src })} />
                <DocImage title="Selfie" src={editDraftApp.documents.selfieHoldingIdDataUrl} fallback={editDraftApp.documents.selfieHoldingIdName} onOpen={(title, src) => setDocPreview({ title, src })} />
              </div>
            </Box>

            <div className="flex gap-2">
              <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={saveEdit} disabled={loading}>
                Save
              </Button>
              <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setEditUserId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!statusModalAppId} title="Change Status" onClose={() => setStatusModalAppId(null)}>
        <div className="space-y-4">
          <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as Application['status'])} className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]">
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} placeholder="Status label" className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]" />
          <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Status note" className="min-h-[100px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0b4a90]" />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={saveStatus} disabled={loading}>
              Save
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setStatusModalAppId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!codeModalAppId} title="Change Withdrawal Code" onClose={() => setCodeModalAppId(null)}>
        <div className="space-y-4">
          <input value={withdrawCode} onChange={(e) => setWithdrawCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]" />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={saveWithdrawCode} disabled={loading}>
              Save
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setCodeModalAppId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!withdrawErrorModalAppId} title="Withdraw Error" onClose={() => setWithdrawErrorModalAppId(null)} maxWidthClassName="max-w-xl">
        <div className="space-y-4">
          <textarea
            value={withdrawErrorText}
            onChange={(e) => setWithdrawErrorText(e.target.value.slice(0, 1500))}
            placeholder="Write error message for withdraw page (leave empty to disable)"
            className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0b4a90]"
          />
          <input
            value={withdrawErrorMedia}
            onChange={(e) => setWithdrawErrorMedia(e.target.value.slice(0, 45000))}
            placeholder="Optional media URL / data URL"
            className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]"
          />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={saveWithdrawError} disabled={loading}>
              Save
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded px-4 text-sm font-bold"
              onClick={() => {
                setWithdrawErrorModalAppId(null);
                setWithdrawErrorText('');
                setWithdrawErrorMedia('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!adjustUserId} title="Add / Subtract Balance" onClose={() => setAdjustUserId(null)}>
        <div className="space-y-4">
          <input value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Enter amount (use minus to subtract)" className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90]" />
          <div className="flex gap-2">
            <Button className="h-10 rounded bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" onClick={applyAdjust} disabled={loading}>
              Apply
            </Button>
            <Button variant="outline" className="h-10 rounded px-4 text-sm font-bold" onClick={() => setAdjustUserId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!docPreview} title={docPreview?.title} onClose={() => setDocPreview(null)} maxWidthClassName="max-w-3xl">
        {docPreview && <img src={docPreview.src} alt={docPreview.title} className="max-h-[70vh] w-full rounded-xl border bg-white object-contain" />}
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
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-bold ${
        active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className={`rounded px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
    </button>
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
