import { useEffect, useState, type FormEvent } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { findUserByLogin, setSession } from '../lib/db';

type AuthPageProps = {
  onLogin: () => void;
  onGoRegister: () => void;
};

export function AuthPage({ onLogin, onGoRegister }: AuthPageProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const notice = localStorage.getItem('take_easy_loan_blocked_notice');
    if (notice) {
      setError(notice);
      localStorage.removeItem('take_easy_loan_blocked_notice');
    }
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!loginId.trim()) {
      setError('Phone or Email is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    const user = findUserByLogin(loginId);
    if (!user) {
      setError('No account found. Please register first.');
      return;
    }
    if (user.disabledLogin) {
      setError('Login disabled by admin. Please contact customer service.');
      return;
    }

    const idMatches = user.phoneOrEmail.trim().toLowerCase() === loginId.trim().toLowerCase();
    const passMatches = user.password === password;
    if (!idMatches || !passMatches) {
      setError('Invalid login details.');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSession({ isLoggedIn: true, userId: user.id, lastLoginAt: Date.now() });
    setLoading(false);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Login</h1>
        <p className="mt-1 text-sm text-slate-600">Use your registered Phone/Email and Password.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="loginId" className="text-sm font-bold text-slate-700">
              Phone OR Email
            </Label>
            <Input
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Enter phone or email"
              className="h-11 rounded-lg border-slate-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-bold text-slate-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-11 rounded-lg border-slate-300"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
          If you don&apos;t have an account,{' '}
          <button type="button" className="font-extrabold text-[#0b4a90] hover:underline" onClick={onGoRegister}>
            Register here
          </button>
          .
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
