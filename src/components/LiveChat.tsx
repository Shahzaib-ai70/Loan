import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Headset, Mail, MessageCircle, PhoneCall, Send } from 'lucide-react';
import { getCurrentUser } from '../lib/db';
import { chatApi, supportApi, type ChatMessage, type SupportSettings } from '../lib/api';

type LiveChatProps = {
  onBack: () => void;
};

export function LiveChat({ onBack }: LiveChatProps) {
  const user = useMemo(() => getCurrentUser(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [settings, setSettings] = useState<SupportSettings>({
    whatsappLink: 'https://wa.me/17733229624',
    telegramLink: 'https://t.me/vbloanbank_support',
    supportEmail: 'support@vbloanbank.com',
    helpline: '+1 773 322 9624',
  });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatApi.getMessages(user.id);
      setMessages(res.messages);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load messages.');
    }
  }, [user]);

  useEffect(() => {
    supportApi
      .getSettings()
      .then((r) => setSettings(r.settings))
      .catch(() => {});
    load();
    if (!user) return;
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, [load, user]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = useCallback(async () => {
    if (!user) return;
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    setError('');
    try {
      await chatApi.sendUserMessage(user.id, msg, user.phoneOrEmail);
      setText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }, [load, text, user]);

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b4a90]/10">
            <Headset className="h-6 w-6 text-[#0b4a90]" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">Customer Service</div>
            <div className="text-sm font-semibold text-slate-600">WhatsApp, Telegram, and Live Chat support.</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <a
            href={`tel:${settings.helpline}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="h-5 w-5 text-[#0b4a90]" />
              Hotline {settings.helpline}
            </div>
            <span className="text-slate-400">›</span>
          </a>

          <a
            href={settings.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp Support
            </div>
            <span className="text-slate-400">›</span>
          </a>

          <a
            href={settings.telegramLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-sky-500" />
              Telegram Support
            </div>
            <span className="text-slate-400">›</span>
          </a>

          <a
            href={`mailto:${settings.supportEmail}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#0b4a90]" />
              {settings.supportEmail}
            </div>
            <span className="text-slate-400">›</span>
          </a>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <MessageCircle className="h-5 w-5 text-[#0b4a90]" />
            <div className="text-sm font-extrabold text-slate-900">Live Chat</div>
            <div className="flex-1" />
            <button type="button" className="text-xs font-bold text-[#0b4a90] hover:underline" onClick={load}>
              Refresh
            </button>
          </div>

          {!user ? (
            <div className="px-4 py-6 text-sm font-semibold text-slate-600">Please login to use live chat.</div>
          ) : (
            <>
              {error && (
                <div className="px-4 pt-4">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                </div>
              )}

              <div ref={listRef} className="h-64 overflow-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-sm font-semibold text-slate-500">No messages yet. Send a message to customer service.</div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const mine = m.sender === 'user';
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm font-semibold ${
                              mine ? 'bg-[#0b4a90] text-white' : 'bg-slate-100 text-slate-800'
                            }`}
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
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-200 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                  className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[#0b4a90]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                />
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b4a90] text-white hover:bg-[#093b74] disabled:opacity-50"
                  onClick={send}
                  disabled={sending || !text.trim()}
                  aria-label="Send"
                >
                  {sending ? <Send className="h-5 w-5 opacity-70" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
