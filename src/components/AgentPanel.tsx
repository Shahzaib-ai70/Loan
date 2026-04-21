import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from './ui/Button';
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

  useEffect(() => {
    if (!agentKey) return;
    loadOverview(agentKey);
  }, [agentKey]);

  useEffect(() => {
    if (!agentKey) return;
    const id = window.setInterval(() => {
      loadOverview(agentKey);
    }, 10000);
    return () => window.clearInterval(id);
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
                          </tr>
                        );
                      })}
                      {!filteredUsers.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={7}>
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
                        {['ID', 'Order Number', 'Date', 'User', 'Registered Amount', 'Term (Months)', 'Status'].map((h) => (
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
                        return (
                          <tr key={app.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold">{rowId}</td>
                            <td className="px-3 py-2">{orderNo}</td>
                            <td className="px-3 py-2">{date}</td>
                            <td className="px-3 py-2">{u?.phoneOrEmail || app.applicant.fullName || '-'}</td>
                            <td className="px-3 py-2">{app.loan.amount.toLocaleString()}</td>
                            <td className="px-3 py-2">{app.loan.termMonths}</td>
                            <td className="px-3 py-2">{statusText}</td>
                          </tr>
                        );
                      })}
                      {!filteredApps.length && (
                        <tr>
                          <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={7}>
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

