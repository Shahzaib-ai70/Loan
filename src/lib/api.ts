type ApiError = {
  message?: string;
};

const baseUrl = (() => {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
    if (v && v.trim()) return v.trim();
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocal) return 'http://localhost:4000';
    return '';
  } catch {
    return 'http://localhost:4000';
  }
})();

export type ChatMessage = {
  id: string;
  userId: string;
  sender: 'user' | 'admin';
  message: string;
  createdAt: number;
};

export type ChatThread = {
  userId: string;
  phoneOrEmail: string;
  lastMessage: string;
  lastSender: string;
  lastAt: number;
};

export type SupportSettings = {
  whatsappLink: string;
  telegramLink: string;
  supportEmail: string;
  helpline: string;
};

export type AppSettings = {
  currencySignEnabled: boolean;
  currencySymbol: string;
};

export type PageErrorConfig = {
  enabled: boolean;
  message: string;
};

export type PageErrors = Record<string, PageErrorConfig>;

export type AdminLoginResponse = {
  ok: boolean;
  adminPin: string;
};

export type ApiSession = {
  isLoggedIn: boolean;
  userId: string;
  lastLoginAt: number;
};

export type ApiUser = {
  id: string;
  gender: string;
  phoneOrEmail: string;
  createdAt: number;
  lastApplicationId?: string;
  agentId?: string;
  inviteCode?: string;
  disabledLogin?: boolean;
};

export type AdminOverviewResponse = {
  users: ApiUser[];
  applications: unknown[];
  balances: Record<string, { currentBalance: number; withdrawnAmount: number }>;
};

export type AgentSummary = {
  id: string;
  username: string;
  password?: string;
  inviteCode: string;
  createdAt: number;
  totalCustomers: number;
};

export type AdminAgentsResponse = {
  agents: AgentSummary[];
};

export type AgentLoginResponse = {
  ok: boolean;
  agentKey: string;
  agent: { id: string; username: string; inviteCode: string; createdAt: number };
};

export type AgentOverviewResponse = {
  agent: { id: string; username: string; inviteCode: string };
  users: ApiUser[];
  applications: unknown[];
  balances: Record<string, { currentBalance: number; withdrawnAmount: number }>;
};

export type AuthRegisterResponse = {
  user: ApiUser;
  session: ApiSession;
};

export type AuthLoginResponse = {
  user: ApiUser;
  latestApplication: unknown | null;
  session: ApiSession;
};

export type CreateApplicationResponse = {
  application: unknown;
};

export type LatestApplicationResponse = {
  application: unknown | null;
};

export type WithdrawResponse = {
  message: string;
  amount: number;
  balance: { currentBalance: number; withdrawnAmount: number };
};

export type AppointmentStatus = 'pending' | 'accepted' | 'rejected';

export type Appointment = {
  id: string;
  userId: string;
  phoneOrEmail: string;
  name: string;
  amount: string;
  date: string;
  time: string;
  location: string;
  note: string;
  createdAt: number;
  status: AppointmentStatus;
  decidedAt: number | null;
};

export type AdminAppointmentsResponse = {
  appointments: Appointment[];
};

export type PublicSettingsResponse = {
  settings: AppSettings;
  pageErrors?: PageErrors;
};

export type AdminUpdateAppSettingsResponse = {
  ok: boolean;
  settings: AppSettings;
};

export type AdminPageErrorsResponse = {
  pageErrors: PageErrors;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.message) msg = body.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
};

export const chatApi = {
  getMessages: (userId: string) => request<{ messages: ChatMessage[] }>(`/api/chat/messages/${encodeURIComponent(userId)}`),
  sendUserMessage: (userId: string, message: string, phoneOrEmail?: string) =>
    request<{ ok: boolean; id: string }>(`/api/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ userId, message, phoneOrEmail }),
    }),
  adminGetThreads: (adminPin: string) =>
    request<{ threads: ChatThread[] }>(`/api/admin/chat/threads`, {
      headers: { 'x-admin-pin': adminPin },
    }),
  adminGetMessages: (adminPin: string, userId: string) =>
    request<{ messages: ChatMessage[] }>(`/api/admin/chat/messages/${encodeURIComponent(userId)}`, {
      headers: { 'x-admin-pin': adminPin },
    }),
  adminSendMessage: (adminPin: string, userId: string, message: string) =>
    request<{ ok: boolean; id: string }>(`/api/admin/chat/messages/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify({ message }),
    }),
};

export const publicApi = {
  getSettings: () => request<PublicSettingsResponse>(`/api/public/settings`),
};

export const adminApi = {
  login: (params: { pin?: string; username?: string; password?: string }) =>
    request<AdminLoginResponse>(`/api/admin/login`, { method: 'POST', body: JSON.stringify(params) }),
  getOverview: (adminPin: string) =>
    request<AdminOverviewResponse>(`/api/admin/overview`, { headers: { 'x-admin-pin': adminPin } }),
  getApplication: (adminPin: string, appId: string) =>
    request<{ application: unknown }>(`/api/admin/applications/${encodeURIComponent(appId)}`, {
      headers: { 'x-admin-pin': adminPin },
    }),
  getAgents: (adminPin: string) =>
    request<AdminAgentsResponse>(`/api/admin/agents`, { headers: { 'x-admin-pin': adminPin } }),
  getAppointments: (adminPin: string) =>
    request<AdminAppointmentsResponse>(`/api/admin/appointments`, { headers: { 'x-admin-pin': adminPin } }),
  decideAppointment: (adminPin: string, appointmentId: string, payload: { status: 'accepted' | 'rejected'; note?: string }) =>
    request<{ ok: boolean }>(`/api/admin/appointments/${encodeURIComponent(appointmentId)}/decision`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(payload),
    }),
  createAgent: (adminPin: string, payload: { username: string; password: string; inviteCode: string }) =>
    request<{ agent: AgentSummary }>(`/api/admin/agents`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(payload),
    }),
  updateApplication: (adminPin: string, appId: string, patch: unknown) =>
    request<{ application: unknown }>(`/api/admin/applications/${encodeURIComponent(appId)}`, {
      method: 'PUT',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(patch),
    }),
  setUserBalance: (adminPin: string, userId: string, currentBalance: number) =>
    request<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}/balance`, {
      method: 'PUT',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify({ currentBalance }),
    }),
  updateUser: (adminPin: string, userId: string, patch: { gender?: string; phoneOrEmail?: string; password?: string; inviteCode?: string; disabledLogin?: boolean }) =>
    request<{ user: ApiUser }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(patch),
    }),
  deleteUser: (adminPin: string, userId: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': adminPin },
    }),
  updateAppSettings: (adminPin: string, payload: { currencySignEnabled: boolean; currencySymbol: string }) =>
    request<AdminUpdateAppSettingsResponse>(`/api/admin/app/settings`, {
      method: 'PUT',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(payload),
    }),
  getPageErrors: (adminPin: string) =>
    request<AdminPageErrorsResponse>(`/api/admin/page-errors`, { headers: { 'x-admin-pin': adminPin } }),
  updatePageErrors: (adminPin: string, pageErrors: PageErrors) =>
    request<{ ok: boolean; pageErrors: PageErrors }>(`/api/admin/page-errors`, {
      method: 'PUT',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify({ pageErrors }),
    }),
};

export const agentApi = {
  login: (params: { username: string; password: string }) =>
    request<AgentLoginResponse>(`/api/agent/login`, { method: 'POST', body: JSON.stringify(params) }),
  getOverview: (agentKey: string) =>
    request<AgentOverviewResponse>(`/api/agent/overview`, { headers: { 'x-agent-key': agentKey } }),
  updateApplication: (agentKey: string, appId: string, patch: unknown) =>
    request<{ application: unknown }>(`/api/agent/applications/${encodeURIComponent(appId)}`, {
      method: 'PUT',
      headers: { 'x-agent-key': agentKey },
      body: JSON.stringify(patch),
    }),
  setUserBalance: (agentKey: string, userId: string, currentBalance: number) =>
    request<{ ok: boolean }>(`/api/agent/users/${encodeURIComponent(userId)}/balance`, {
      method: 'PUT',
      headers: { 'x-agent-key': agentKey },
      body: JSON.stringify({ currentBalance }),
    }),
  updateUser: (
    agentKey: string,
    userId: string,
    patch: { gender?: string; phoneOrEmail?: string; password?: string; inviteCode?: string; disabledLogin?: boolean },
  ) =>
    request<{ user: ApiUser & { inviteCode?: string } }>(`/api/agent/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'x-agent-key': agentKey },
      body: JSON.stringify(patch),
    }),
  deleteUser: (agentKey: string, userId: string) =>
    request<{ ok: boolean }>(`/api/agent/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'x-agent-key': agentKey },
    }),
};

export const authApi = {
  register: (params: { gender: string; phoneOrEmail: string; password: string; inviteCode: string }) =>
    request<AuthRegisterResponse>(`/api/auth/register`, { method: 'POST', body: JSON.stringify(params) }),
  login: (params: { loginId: string; password: string }) =>
    request<AuthLoginResponse>(`/api/auth/login`, { method: 'POST', body: JSON.stringify(params) }),
};

export const applicationsApi = {
  create: (payload: unknown) =>
    request<CreateApplicationResponse>(`/api/applications`, { method: 'POST', body: JSON.stringify(payload) }),
  getLatest: (userId: string) =>
    request<LatestApplicationResponse>(`/api/applications/latest/${encodeURIComponent(userId)}`),
};

export const usersApi = {
  getUser: (userId: string) => request<{ user: ApiUser }>(`/api/users/${encodeURIComponent(userId)}`),
  getBalance: (userId: string) =>
    request<{ balance: { currentBalance: number; withdrawnAmount: number } }>(`/api/users/${encodeURIComponent(userId)}/balance`),
};

export const withdrawApi = {
  withdraw: (params: { userId: string; code: string }) =>
    request<WithdrawResponse>(`/api/withdraw`, { method: 'POST', body: JSON.stringify(params) }),
};

export const supportApi = {
  getSettings: () => request<{ settings: SupportSettings }>(`/api/support/settings`),
  adminGetSettings: (adminPin: string) =>
    request<{ settings: SupportSettings }>(`/api/admin/support/settings`, {
      headers: { 'x-admin-pin': adminPin },
    }),
  adminUpdateSettings: (adminPin: string, settings: SupportSettings) =>
    request<{ ok: boolean }>(`/api/admin/support/settings`, {
      method: 'PUT',
      headers: { 'x-admin-pin': adminPin },
      body: JSON.stringify(settings),
    }),
};
