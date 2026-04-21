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
};

export type AdminOverviewResponse = {
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

export const adminApi = {
  login: (params: { pin?: string; username?: string; password?: string }) =>
    request<AdminLoginResponse>(`/api/admin/login`, { method: 'POST', body: JSON.stringify(params) }),
  getOverview: (adminPin: string) =>
    request<AdminOverviewResponse>(`/api/admin/overview`, { headers: { 'x-admin-pin': adminPin } }),
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
  getBalance: (userId: string) =>
    request<{ balance: { currentBalance: number; withdrawnAmount: number } }>(`/api/users/${encodeURIComponent(userId)}/balance`),
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
