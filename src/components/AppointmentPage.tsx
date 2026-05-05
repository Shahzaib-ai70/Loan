import { CalendarClock, ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { chatApi, type Appointment, type AppointmentStatus, type ChatMessage } from '../lib/api';
import { getCurrentUser, getLatestApplicationForUser } from '../lib/db';
import { Button } from './ui/Button';
import { Modal } from './Modal';

type AppointmentPageProps = {
  onBack: () => void;
};

const field =
  'mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20';

export function AppointmentPage({ onBack }: AppointmentPageProps) {
  const user = getCurrentUser();
  const app = user ? getLatestApplicationForUser(user.id) : null;
  const displayName = useMemo(() => app?.applicant?.fullName?.trim() || user?.phoneOrEmail?.split('@')[0] || 'Customer', [app, user]);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const parseAppointmentRequest = (message: string) => {
    const raw = String(message || '').trim();
    if (!raw.toUpperCase().startsWith('APPOINTMENT REQUEST')) return null;
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const getVal = (prefix: string) => {
      const line = lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
      if (!line) return '';
      return String(line.slice(prefix.length)).trim();
    };
    return {
      amount: getVal('Deposit Amount:'),
      date: getVal('Date:'),
      time: getVal('Time:'),
      location: getVal('Location/Branch:'),
      note: getVal('Note:'),
      name: getVal('Name:'),
      login: getVal('Login:'),
    };
  };

  const parseDecision = (m: ChatMessage): { appointmentId: string; status: AppointmentStatus } | null => {
    const first = String(m.message || '').trim().split('\n')[0] || '';
    if (!first.toUpperCase().startsWith('APPOINTMENT_DECISION|')) return null;
    const parts = first.split('|');
    const appointmentId = String(parts[1] || '').trim();
    const status = String(parts[2] || '').trim().toLowerCase() as AppointmentStatus;
    if (!appointmentId) return null;
    if (status !== 'accepted' && status !== 'rejected') return null;
    return { appointmentId, status };
  };

  const buildAppointmentsFromMessages = (messages: ChatMessage[]): Appointment[] => {
    const decisions = new Map<string, { status: AppointmentStatus; decidedAt: number }>();
    const sorted = [...messages].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    for (const m of sorted) {
      const parsed = parseDecision(m);
      if (!parsed) continue;
      if (decisions.has(parsed.appointmentId)) continue;
      decisions.set(parsed.appointmentId, { status: parsed.status, decidedAt: m.createdAt });
    }

    const out: Appointment[] = [];
    for (const m of sorted) {
      const parsed = parseAppointmentRequest(m.message);
      if (!parsed) continue;
      const decision = decisions.get(m.id);
      out.push({
        id: m.id,
        userId: m.userId,
        phoneOrEmail: parsed.login || user?.phoneOrEmail || '',
        name: parsed.name || '',
        amount: parsed.amount || '',
        date: parsed.date || '',
        time: parsed.time || '',
        location: parsed.location || '',
        note: parsed.note || '',
        createdAt: m.createdAt,
        status: decision?.status || 'pending',
        decidedAt: decision?.decidedAt ?? null,
      });
    }
    return out;
  };

  const loadAppointments = async () => {
    if (!user) return;
    setAppointmentsLoading(true);
    setError('');
    try {
      const res = await chatApi.getMessages(user.id);
      setAppointments(buildAppointmentsFromMessages(res.messages || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments.');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAppointments();
  }, [user?.id]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!user) {
      setError('Please login first.');
      return;
    }
    const amt = amount.trim();
    const loc = location.trim();
    if (!amt) {
      setError('Please enter deposit amount.');
      return;
    }
    if (!date) {
      setError('Please select appointment date.');
      return;
    }
    if (!time) {
      setError('Please select appointment time.');
      return;
    }
    if (!loc) {
      setError('Please enter location/branch.');
      return;
    }

    const message = [
      'APPOINTMENT REQUEST (Deposit Money)',
      `Name: ${displayName}`,
      `Login: ${user.phoneOrEmail}`,
      `Deposit Amount: ${amt}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Location/Branch: ${loc}`,
      note.trim() ? `Note: ${note.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    setSubmitting(true);
    try {
      await chatApi.sendUserMessage(user.id, message, user.phoneOrEmail);
      setDoneOpen(true);
      setAmount('');
      setDate('');
      setTime('');
      setLocation('');
      setNote('');
      loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-4 px-4 pb-10 pt-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" className="h-10 rounded-lg px-3" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <CalendarClock className="h-5 w-5 text-[#0b4a90]" />
          Appointment
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">Book appointment for deposit</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">Fill this form before you come to deposit money.</div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div>
            <div className="text-xs font-bold text-slate-700">Name</div>
            <input value={displayName} readOnly className={field} />
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700">Deposit Amount</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 12))} placeholder="Enter amount" className={field} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-700">Date</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">Time</div>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700">Location / Branch</div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter branch/location" className={field} />
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700">Note (optional)</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any extra details"
              className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
            />
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Appointment'}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Your appointments</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Status updates appear here after admin accepts or rejects.</div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg px-3 text-xs font-extrabold"
            onClick={loadAppointments}
            disabled={appointmentsLoading || !user}
          >
            {appointmentsLoading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-y border-slate-200 bg-white text-slate-700">
              <tr>
                {['Date', 'Amount', 'Appointment Date', 'Time', 'Location', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const created = new Date(a.createdAt).toLocaleString();
                const statusText = a.status === 'accepted' ? 'Accepted' : a.status === 'rejected' ? 'Rejected' : 'Pending';
                return (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{created}</td>
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
                  </tr>
                );
              })}
              {!appointments.length && (
                <tr>
                  <td className="px-3 py-6 text-sm font-semibold text-slate-500" colSpan={6}>
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={doneOpen} title="Appointment" onClose={() => setDoneOpen(false)}>
        <div className="space-y-3 text-center">
          <div className="text-base font-semibold text-slate-700">Appointment submitted successfully.</div>
          <Button type="button" className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]" onClick={() => setDoneOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}

