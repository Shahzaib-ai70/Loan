import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronRight, LockKeyhole, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { authApi } from '../lib/api';
import { getSession, setSession, upsertUser, type Gender } from '../lib/db';

type RegisterFormData = {
  gender: Gender;
  phoneOrEmail: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
};

type LoanApplicationFormProps = {
  onRegistered: () => void;
  onLogin: () => void;
};

const SUPPORT_LINKS = [
  'Exchange Rates',
  'Savings Book Lookup',
  'Deposit Interest Rates',
  'Fee Schedule',
];

const TERMS_ACCEPTED_KEY_PREFIX = 'take_easy_loan_terms_accepted_user_';
const TERMS_PENDING_KEY_PREFIX = 'take_easy_loan_terms_pending_user_';

export function LoanApplicationForm({ onRegistered, onLogin }: LoanApplicationFormProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    gender: 'Male',
    phoneOrEmail: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.isLoggedIn) return;
    try {
      const accepted = localStorage.getItem(`${TERMS_ACCEPTED_KEY_PREFIX}${session.userId}`) === '1';
      const pending = localStorage.getItem(`${TERMS_PENDING_KEY_PREFIX}${session.userId}`) === '1';
      if (pending && !accepted) {
        setTermsAccepted(false);
        setTermsOpen(true);
      }
    } catch {
    }
  }, []);

  const updateField = <K extends keyof RegisterFormData>(key: K, value: RegisterFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitted(false);

    if (!formData.phoneOrEmail.trim()) {
      setError('Mobile Phone OR Email is required.');
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Confirm Password does not match.');
      return;
    }
    if (!formData.inviteCode.trim()) {
      setError('Invite Code is required.');
      return;
    }

    setSubmitted(true);
    try {
      const res = await authApi.register({
        gender: formData.gender,
        phoneOrEmail: formData.phoneOrEmail.trim(),
        password: formData.password,
        inviteCode: formData.inviteCode.trim(),
      });
      upsertUser({
        id: res.user.id,
        gender: res.user.gender as Gender,
        phoneOrEmail: res.user.phoneOrEmail,
        password: formData.password,
        inviteCode: formData.inviteCode.trim(),
        agentId: res.user.agentId,
        createdAt: res.user.createdAt,
        lastApplicationId: res.user.lastApplicationId,
        disabledLogin: false,
      });
      setSession(res.session);
      try {
        localStorage.setItem(`${TERMS_PENDING_KEY_PREFIX}${res.session.userId}`, '1');
        localStorage.removeItem(`${TERMS_ACCEPTED_KEY_PREFIX}${res.session.userId}`);
      } catch {
      }
      setTermsAccepted(false);
      setTermsOpen(true);
    } catch (e) {
      setSubmitted(false);
      const msg = e instanceof Error ? e.message : 'Unable to create account.';
      setError(msg.includes('Account already exists') ? 'You have already applied for a loan. Please login.' : msg);
    }
  };

  const handleSubscribe = () => {
    if (!subscribeEmail.trim()) {
      setSubscribeMessage('Please enter your email.');
      return;
    }
    setSubscribeMessage('Successfully subscribed. Thank you!');
    setSubscribeEmail('');
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <Modal open={termsOpen} title="Loan Terms & Conditions" onClose={() => {}} maxWidthClassName="max-w-lg">
        <div className="space-y-4 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="font-extrabold text-slate-900">Please read before you continue</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              <li>Information you submit must be correct and complete.</li>
              <li>You may be asked to provide documents for verification.</li>
              <li>If your application has mistakes or false information, a verification/processing fee may be charged.</li>
              <li>If approved, you agree to repay the loan on time and follow the repayment terms shown in your contract.</li>
              <li>We may contact you by phone/email for updates and verification.</li>
              <li>By continuing, you agree to these terms.</li>
            </ul>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="radio"
              name="termsAccepted"
              checked={termsAccepted}
              onChange={() => setTermsAccepted(true)}
              className="mt-1 h-4 w-4 accent-[#0b4a90]"
            />
            <span className="font-semibold">I have read and agree to the Terms & Conditions.</span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              disabled={!termsAccepted}
              onClick={() => {
                if (!termsAccepted) return;
                try {
                  const session = getSession();
                  if (session?.isLoggedIn) {
                    localStorage.setItem(`${TERMS_ACCEPTED_KEY_PREFIX}${session.userId}`, '1');
                    localStorage.removeItem(`${TERMS_PENDING_KEY_PREFIX}${session.userId}`);
                  }
                } catch {
                }
                setTermsOpen(false);
                onRegistered();
              }}
              className="h-11 rounded-md bg-[#0b4a90] px-8 text-sm font-extrabold text-white hover:bg-[#083a70] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-4 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">Home</span> <span className="mx-2">|</span>{' '}
          <span className="font-semibold text-[#0b4a90]">Online Loan</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Register for Online Loan</h1>
        <p className="mt-1 text-sm text-slate-500">Contact Information</p>

        {submitted && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Registration submitted successfully.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <label className="text-sm font-bold text-slate-700 sm:col-span-4">Title</label>
            <div className="flex flex-wrap gap-4 sm:col-span-8">
              {(['Male', 'Female'] as const).map((gender) => (
                <label key={gender} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="gender"
                    checked={formData.gender === gender}
                    onChange={() => updateField('gender', gender)}
                    className="h-4 w-4 accent-[#0b4a90]"
                  />
                  {gender}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <label className="text-sm font-bold text-slate-700 sm:col-span-4">Mobile Phone OR Email*</label>
            <div className="sm:col-span-8">
              <input
                value={formData.phoneOrEmail}
                onChange={(e) => updateField('phoneOrEmail', e.target.value)}
                placeholder="Please enter phone or email"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <label className="text-sm font-bold text-slate-700 sm:col-span-4">Password*</label>
            <div className="sm:col-span-8">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Please enter password"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <label className="text-sm font-bold text-slate-700 sm:col-span-4">Confirm Password*</label>
            <div className="sm:col-span-8">
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="Please enter confirm password"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <label className="text-sm font-bold text-slate-700 sm:col-span-4">Invite Code*</label>
            <div className="sm:col-span-8">
              <input
                value={formData.inviteCode}
                onChange={(e) => updateField('inviteCode', e.target.value)}
                placeholder="Please enter invite code"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#0b4a90] focus:ring-2 focus:ring-[#0b4a90]/20"
              />
            </div>
          </div>

          <div className="pt-2 text-right">
            <Button type="submit" className="h-11 rounded-md bg-[#e21b23] px-8 text-sm font-extrabold text-white hover:bg-[#c9161d]">
              Submit
            </Button>
          </div>

          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              className="font-bold text-[#0b4a90] hover:underline"
              onClick={onLogin}
            >
              Login
            </button>
          </p>
        </form>

        <div className="mt-7 border-t border-slate-200 pt-4 text-sm text-slate-500">
          All customer personal information will be kept confidential
        </div>
      </div>

      <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="bg-slate-50 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-[#0b4a90]">
            <Smartphone className="h-6 w-6" />
            <h3 className="text-xl font-extrabold">Our Loan App on Mobile Devices</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Manage your loan account, track status, and receive updates directly on your mobile.
          </p>
        </div>

        <div className="bg-[#0b4a90] p-6 sm:p-8">
          <h3 className="text-xl font-extrabold text-white">Subscribe for Loan Offers & Updates</h3>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={subscribeEmail}
              onChange={(e) => setSubscribeEmail(e.target.value)}
              placeholder="Your email..."
              className="h-11 w-full rounded-lg border border-white/20 bg-white px-3 text-sm outline-none"
            />
            <Button
              type="button"
              onClick={handleSubscribe}
              className="h-11 rounded-lg bg-[#e21b23] px-6 text-sm font-extrabold text-white hover:bg-[#c9161d]"
            >
              Subscribe
            </Button>
          </div>
          {subscribeMessage && <p className="mt-3 text-sm font-semibold text-white">{subscribeMessage}</p>}
        </div>
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-lg font-extrabold text-slate-900">Support</h4>
            <ul className="mt-3 space-y-2">
              {SUPPORT_LINKS.map((item) => (
                <li key={item}>
                  <a href="#" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#0b4a90]">
                    {item} <ChevronRight className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-[#f8fbff] p-5 ring-1 ring-slate-200">
            <div className="text-xs font-extrabold tracking-wide text-[#0b4a90]">HOTLINE</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">+1 773 322 9624</div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#e21b23] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#c9161d]">
              <LockKeyhole className="h-4 w-4" />
              Electronic banking
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
