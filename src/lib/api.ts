type ApiError = {
  message?: string;
};

const baseUrl = (() => {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
    return (v && v.trim()) || 'http://localhost:4000';
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
