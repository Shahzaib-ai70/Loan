import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { adminApi, chatApi, supportApi, type AgentSummary, type ChatMessage, type ChatThread, type SupportSettings } from '../lib/api';

type AdminSupportChatProps = {
  adminPin: string;
};

export function AdminSupportChat({ adminPin }: AdminSupportChatProps) {
  const SUPPORT_UNLOCK_KEY = 'take_easy_loan_support_chat_unlocked_v1';
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SUPPORT_UNLOCK_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { unlockedAt?: number };
      const ts = Number(parsed?.unlockedAt || 0);
      if (!ts) return false;
      return Date.now() - ts < 1000 * 60 * 60 * 6;
    } catch {
      return false;
    }
  });
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; userId: string; messageId: string } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<SupportSettings>({
    whatsappLink: 'https://wa.me/17733229624',
    telegramLink: 'https://t.me/vbloanbank_support',
    supportEmail: 'support@vbloanbank.com',
    helpline: '+1 773 322 9624',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((t) => t.userId === selectedUserId) ?? null,
    [selectedUserId, threads],
  );

  const loadThreads = useCallback(async () => {
    if (!unlocked) return;
    try {
      const res = await chatApi.adminGetThreads(adminPin);
      setThreads(res.threads);
      setSelectedUserId((prev) => prev || res.threads[0]?.userId || null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load chat threads.');
    }
  }, [adminPin, unlocked]);

  const loadMessages = useCallback(async () => {
    if (!unlocked) return;
    if (!selectedUserId) return;
    try {
      const res = await chatApi.adminGetMessages(adminPin, selectedUserId);
      setMessages(res.messages);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load messages.');
    }
  }, [adminPin, selectedUserId, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    loadThreads();
    const id = window.setInterval(loadThreads, 2500);
    return () => window.clearInterval(id);
  }, [loadThreads, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    supportApi
      .adminGetSettings(adminPin)
      .then((r) => setSettings(r.settings))
      .catch(() => {});
  }, [adminPin, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    adminApi
      .getAgents(adminPin)
      .then((r) => setAgents(r.agents || []))
      .catch(() => {});
  }, [adminPin, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    loadMessages();
    if (!selectedUserId) return;
    const id = window.setInterval(loadMessages, 1500);
    return () => window.clearInterval(id);
  }, [loadMessages, selectedUserId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = useCallback(async () => {
    if (!selectedUserId) return;
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    setError('');
    try {
      await chatApi.adminSendMessage(adminPin, selectedUserId, msg);
      setText('');
      await loadThreads();
      await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }, [adminPin, loadMessages, loadThreads, selectedUserId, text]);

  if (!unlocked) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#0b4a90]" />
            <div className="text-lg font-extrabold text-slate-900">Customer Service</div>
          </div>
        </div>
        <div className="p-6">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-extrabold text-slate-900">Unlock Live Chat</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">Enter Admin PIN to open chat conversations.</div>
            {(unlockError || error) && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {unlockError || error}
              </div>
            )}
            <div className="mt-4 space-y-3">
              <input
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
                placeholder="6-digit PIN"
                inputMode="numeric"
                type="password"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  setUnlockError('');
                  if (!unlockInput.trim()) {
                    setUnlockError('Enter Admin PIN.');
                    return;
                  }
                  if (unlockInput.trim() !== adminPin) {
                    setUnlockError('Invalid Admin PIN.');
                    return;
                  }
                  try {
                    sessionStorage.setItem(SUPPORT_UNLOCK_KEY, JSON.stringify({ unlockedAt: Date.now() }));
                  } catch {
                  }
                  setUnlocked(true);
                  setUnlockInput('');
                }}
              />
              <button
                type="button"
                className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
                onClick={() => {
                  setUnlockError('');
                  if (!unlockInput.trim()) {
                    setUnlockError('Enter Admin PIN.');
                    return;
                  }
                  if (unlockInput.trim() !== adminPin) {
                    setUnlockError('Invalid Admin PIN.');
                    return;
                  }
                  try {
                    sessionStorage.setItem(SUPPORT_UNLOCK_KEY, JSON.stringify({ unlockedAt: Date.now() }));
                  } catch {
                  }
                  setUnlocked(true);
                  setUnlockInput('');
                }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#0b4a90]" />
          <div className="text-lg font-extrabold text-slate-900">Customer Service</div>
        </div>
          <div className="flex items-center gap-2">
            <a
              href={settings.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
            </a>
            <a
              href={settings.telegramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
            >
              <Send className="h-4 w-4 text-sky-500" /> Telegram
            </a>
            <button type="button" className="text-xs font-bold text-[#0b4a90] hover:underline" onClick={loadThreads}>
              Refresh
            </button>
          </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="text-xs font-extrabold text-slate-700">Support Links (Admin Editable)</div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div>
            <div className="mb-1 text-[11px] font-bold text-slate-700">WhatsApp Link</div>
            <input
              value={settings.whatsappLink}
              onChange={(e) => setSettings({ ...settings, whatsappLink: e.target.value })}
              className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-[#0b4a90]"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-slate-700">Telegram Link</div>
            <input
              value={settings.telegramLink}
              onChange={(e) => setSettings({ ...settings, telegramLink: e.target.value })}
              className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-[#0b4a90]"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-slate-700">Support Email</div>
            <input
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-[#0b4a90]"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-slate-700">Helpline</div>
            <div className="flex gap-2">
              <input
                value={settings.helpline}
                onChange={(e) => setSettings({ ...settings, helpline: e.target.value })}
                className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-[#0b4a90]"
              />
              <button
                type="button"
                className="h-10 rounded bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={savingSettings}
                onClick={async () => {
                  setSavingSettings(true);
                  setError('');
                  try {
                    await supportApi.adminUpdateSettings(adminPin, settings);
                    setSavingSettings(false);
                  } catch (e) {
                    setSavingSettings(false);
                    setError(e instanceof Error ? e.message : 'Unable to save settings.');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r lg:border-slate-200">
          <div className="p-3">
            <div className="text-xs font-bold text-slate-600">Conversations</div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {threads.length === 0 ? (
              <div className="px-4 pb-6 text-sm font-semibold text-slate-600">No messages yet.</div>
            ) : (
              threads.map((t) => {
                const active = t.userId === selectedUserId;
                return (
                  <button
                    key={t.userId}
                    type="button"
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left ${
                      active ? 'bg-[#f4f6ff]' : 'bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedUserId(t.userId)}
                  >
                    <div className="text-sm font-extrabold text-slate-900">{t.phoneOrEmail || t.userId}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-600">{t.lastMessage || '-'}</div>
                    {!!t.assignedAgentUsername && <div className="mt-1 text-[11px] font-bold text-slate-500">Assigned: {t.assignedAgentUsername}</div>}
                    <div className="mt-1 text-[11px] font-bold text-slate-400">{t.lastAt ? new Date(t.lastAt).toLocaleString() : ''}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-h-[520px] flex-col">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-extrabold text-slate-900">{selectedThread?.phoneOrEmail || selectedUserId || 'Select a conversation'}</div>
            {selectedUserId && <div className="text-xs font-semibold text-slate-500">User ID: {selectedUserId}</div>}
            {selectedUserId && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-bold text-slate-600">Assign to agent:</div>
                <select
                  className="h-9 rounded border border-slate-300 bg-white px-2 text-xs font-semibold outline-none focus:border-[#0b4a90]"
                  value={selectedThread?.assignedAgentId || ''}
                  disabled={assigning}
                  onChange={async (e) => {
                    if (!selectedUserId) return;
                    const next = e.target.value ? e.target.value : null;
                    setAssigning(true);
                    setError('');
                    try {
                      await chatApi.adminAssignThread(adminPin, selectedUserId, next);
                      await loadThreads();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to assign chat.');
                    } finally {
                      setAssigning(false);
                    }
                  }}
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.username}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="h-9 rounded bg-red-600 px-3 text-xs font-extrabold text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={deletingThread}
                  onClick={async () => {
                    if (!selectedUserId) return;
                    const ok = window.confirm('Delete this whole chat? This cannot be undone.');
                    if (!ok) return;
                    setDeletingThread(true);
                    setError('');
                    try {
                      await chatApi.adminDeleteThread(adminPin, selectedUserId);
                      setSelectedUserId(null);
                      setMessages([]);
                      setContextMenu(null);
                      await loadThreads();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to delete chat.');
                    } finally {
                      setDeletingThread(false);
                    }
                  }}
                >
                  Delete Chat
                </button>
              </div>
            )}
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-auto bg-white px-4 py-4"
            onClick={() => setContextMenu(null)}
            onScroll={() => setContextMenu(null)}
          >
            {selectedUserId ? (
              messages.length === 0 ? (
                <div className="text-sm font-semibold text-slate-500">No messages in this conversation.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.sender === 'admin';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm font-semibold ${
                            mine ? 'bg-[#0b4a90] text-white' : 'bg-slate-100 text-slate-800'
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (!selectedUserId) return;
                            setContextMenu({ x: e.clientX, y: e.clientY, userId: selectedUserId, messageId: m.id });
                          }}
                        >
                          {m.message}
                          <div className={`mt-1 text-[10px] font-bold ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                            {new Date(m.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-sm font-semibold text-slate-500">Select a conversation from the left.</div>
            )}
          </div>

          {contextMenu && (
            <div
              className="fixed z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50"
                disabled={deletingMessageId === contextMenu.messageId}
                onClick={async () => {
                  const ok = window.confirm('Delete this message?');
                  if (!ok) return;
                  setDeletingMessageId(contextMenu.messageId);
                  setError('');
                  try {
                    await chatApi.adminDeleteMessage(adminPin, contextMenu.userId, contextMenu.messageId);
                    setContextMenu(null);
                    await loadThreads();
                    await loadMessages();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unable to delete message.');
                  } finally {
                    setDeletingMessageId(null);
                  }
                }}
              >
                Delete message
              </button>
            </div>
          )}

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your reply..."
                className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[#0b4a90]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                disabled={!selectedUserId}
              />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b4a90] text-white hover:bg-[#093b74] disabled:opacity-50"
                onClick={send}
                disabled={!selectedUserId || sending || !text.trim()}
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
