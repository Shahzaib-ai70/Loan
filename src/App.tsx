import { useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoanApplicationForm } from './components/LoanApplicationForm';
import AuthPage from './components/AuthPage';
import { LoanLandingPage } from './components/LoanLandingPage';
import { LoanApplicationWizard } from './components/LoanApplicationWizard';
import { ApplicationStatus } from './components/ApplicationStatus';
import { WithdrawPage } from './components/WithdrawPage';
import { AdminPanel } from './components/AdminPanel';
import { AdminEditUser } from './components/AdminEditUser';
import { AgentPanel } from './components/AgentPanel';
import { TopBar } from './components/TopBar';
import { UserProfile } from './components/UserProfile';
import { MyInformation } from './components/MyInformation';
import { MyInformationId } from './components/MyInformationId';
import { MyInformationContact } from './components/MyInformationContact';
import { MyInformationBank } from './components/MyInformationBank';
import { MyInformationSignature } from './components/MyInformationSignature';
import { LoanContract } from './components/LoanContract';
import { LiveChat } from './components/LiveChat';
import { OffersPage } from './components/OffersPage';
import { ExchangeRatesPage } from './components/ExchangeRatesPage';
import { DepositRatesPage } from './components/DepositRatesPage';
import { WebsiteNotWorking } from './components/WebsiteNotWorking';
import { Modal } from './components/Modal';
import { Button } from './components/ui/Button';
import {
  ensureMigration,
  getCurrentUser,
  getLatestApplicationForUser,
  getSession,
  setSession,
} from './lib/db';

export type View =
  | 'dashboard'
  | 'register'
  | 'loan-application'
  | 'application-status'
  | 'withdraw'
  | 'auth'
  | 'admin'
  | 'agent'
  | 'admin-edit'
  | 'profile'
  | 'my-information'
  | 'my-information-id'
  | 'my-information-contact'
  | 'my-information-bank'
  | 'my-information-signature'
  | 'loan-contract'
  | 'offers'
  | 'exchange-rates'
  | 'deposit-rates'
  | 'live-chat';

const VIEW_KEY = 'take_easy_loan_current_view';
const PUBLIC_PATH_PREFIXES = ['/online-ca'] as const;
const DEFAULT_PUBLIC_PATH_PREFIX = '/online-ca';
const ADMIN_PATH = '/drugload-admin';
const AGENT_PATH = '/drugload-agent';

const parsePath = (pathname: string) => {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/';
  const match = PUBLIC_PATH_PREFIXES.find((prefix) => p === prefix || p.startsWith(`${prefix}/`));
  if (!match) return { base: '', rest: p };
  const restRaw = p.slice(match.length) || '/';
  return { base: match, rest: restRaw.startsWith('/') ? restRaw : `/${restRaw}` };
};

const isAllowedPublicPath = (pathname: string) => {
  const { base, rest } = parsePath(pathname);
  if (base) return true;
  if (rest === ADMIN_PATH) return true;
  if (rest === AGENT_PATH) return true;
  return false;
};

const isView = (value: string): value is View =>
  [
    'dashboard',
    'register',
    'loan-application',
    'application-status',
    'withdraw',
    'auth',
    'admin',
    'agent',
    'admin-edit',
    'profile',
    'my-information',
    'my-information-id',
    'my-information-contact',
    'my-information-bank',
    'my-information-signature',
    'loan-contract',
    'offers',
    'exchange-rates',
    'deposit-rates',
    'live-chat',
  ].includes(value);

function App() {
  const [adminEditAppId, setAdminEditAppId] = useState<string | null>(() => {
    try {
      const urlAppId = new URLSearchParams(window.location.search).get('appId');
      if (urlAppId) return urlAppId;
      return localStorage.getItem('take_easy_loan_admin_edit_app_id');
    } catch {
      return null;
    }
  });

  const [alreadyAppliedOpen, setAlreadyAppliedOpen] = useState(false);
  const [publicBasePath] = useState(() => {
    try {
      const { base } = parsePath(window.location.pathname || '/');
      return base || DEFAULT_PUBLIC_PATH_PREFIX;
    } catch {
      return DEFAULT_PUBLIC_PATH_PREFIX;
    }
  });
  const blockedPath = (() => {
    try {
      return !isAllowedPublicPath(window.location.pathname || '/');
    } catch {
      return true;
    }
  })();
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const { rest } = parsePath(window.location.pathname || '/');
      if (rest === ADMIN_PATH) return 'admin';
      if (rest === AGENT_PATH) return 'agent';
      const urlView = new URLSearchParams(window.location.search).get('view');
      if (urlView && isView(urlView)) return urlView;
      const raw = localStorage.getItem(VIEW_KEY);
      return raw && isView(raw) ? raw : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    ensureMigration();
  }, []);

  const navigate = useCallback(
    (view: View) => {
      const session = getSession();
      const user = getCurrentUser();
      const app = user ? getLatestApplicationForUser(user.id) : null;

      if (
        (view === 'loan-application' ||
          view === 'application-status' ||
          view === 'withdraw' ||
          view === 'profile' ||
          view === 'my-information' ||
          view === 'my-information-id' ||
          view === 'my-information-contact' ||
          view === 'my-information-bank' ||
          view === 'my-information-signature' ||
          view === 'loan-contract') &&
        !session?.isLoggedIn
      ) {
        setCurrentView('auth');
        return;
      }

      if (view === 'loan-application' && !user) {
        setCurrentView('register');
        return;
      }

      if (view === 'loan-application' && app) {
        setAlreadyAppliedOpen(true);
        setCurrentView('application-status');
        return;
      }

      if (view === 'application-status' && !app) {
        setCurrentView(user ? 'loan-application' : 'register');
        return;
      }
      setCurrentView(view);
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, currentView);
    const url = new URL(window.location.href);
    if (currentView === 'admin') {
      url.pathname = ADMIN_PATH;
      url.searchParams.delete('view');
    } else if (currentView === 'agent') {
      url.pathname = AGENT_PATH;
      url.searchParams.delete('view');
    } else {
      url.pathname = publicBasePath;
      url.searchParams.set('view', currentView);
    }
    if (currentView === 'admin-edit' && adminEditAppId) url.searchParams.set('appId', adminEditAppId);
    else url.searchParams.delete('appId');
    window.history.replaceState({}, '', url.toString());
  }, [adminEditAppId, currentView]);

  useEffect(() => {
    if (currentView !== 'loan-application' && currentView !== 'application-status' && currentView !== 'withdraw') return;
    const session = getSession();
    if (!session?.isLoggedIn) setCurrentView('auth');
  }, [currentView]);

  const handleAuthLogin = useCallback(() => {
    const user = getCurrentUser();
    if (!user) {
      setCurrentView('register');
      return;
    }
    const app = getLatestApplicationForUser(user.id);
    if (app?.status === 'under_review') {
      setCurrentView('application-status');
      return;
    }
    if (app?.status === 'approved') {
      setCurrentView('withdraw');
      return;
    }
    setCurrentView('loan-application');
  }, []);

  const handleUserLogout = useCallback(() => {
    setSession(null);
    setCurrentView('auth');
  }, []);

  const openAdminEdit = useCallback((appId: string) => {
    setAdminEditAppId(appId);
    localStorage.setItem('take_easy_loan_admin_edit_app_id', appId);
    setCurrentView('admin-edit');
  }, []);

  const closeAdminEdit = useCallback(() => {
    setAdminEditAppId(null);
    localStorage.removeItem('take_easy_loan_admin_edit_app_id');
    setCurrentView('admin');
  }, []);

  if (blockedPath) {
    return (
      <Layout onNavigate={navigate} hideHeader hideFooter>
        <WebsiteNotWorking
          officialHome={`${window.location.origin}${DEFAULT_PUBLIC_PATH_PREFIX}?view=dashboard`}
          officialAdmin={`${window.location.origin}${ADMIN_PATH}`}
          officialAgent={`${window.location.origin}${AGENT_PATH}`}
        />
      </Layout>
    );
  }

  return (
    <Layout
      onNavigate={navigate}
      hideHeader
      hideFooter
    >
      <TopBar onNavigate={navigate} showLogout={!!getSession()?.isLoggedIn} onLogout={handleUserLogout} />

      <Modal open={alreadyAppliedOpen} title="Loan Application" onClose={() => setAlreadyAppliedOpen(false)}>
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-700">You have already applied for a loan.</div>
          <div className="text-sm font-semibold text-slate-600">Please check your Application Status.</div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1" onClick={() => setAlreadyAppliedOpen(false)}>
              OK
            </Button>
            <Button
              className="h-11 flex-1 bg-[#0b4a90] font-extrabold text-white hover:bg-[#093b74]"
              onClick={() => {
                setAlreadyAppliedOpen(false);
                navigate('application-status');
              }}
            >
              Status
            </Button>
          </div>
        </div>
      </Modal>

      {currentView === 'dashboard' && <LoanLandingPage onNavigate={navigate} />}

      {currentView === 'register' && (
        <div className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto">
            <LoanApplicationForm
              onRegistered={() => navigate('loan-application')}
              onLogin={() => navigate('auth')}
            />
          </div>
        </div>
      )}

      {currentView === 'loan-application' && (
        <div className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto">
            <LoanApplicationWizard
              onSubmitted={() => navigate('application-status')}
              onBack={() => navigate('dashboard')}
            />
          </div>
        </div>
      )}

      {currentView === 'application-status' && (
        <div className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto">
            <ApplicationStatus onStartNew={() => navigate('profile')} />
          </div>
        </div>
      )}

      {currentView === 'withdraw' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <WithdrawPage onNavigate={navigate} />
        </div>
      )}

      {currentView === 'agent' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <AgentPanel onNavigate={(to) => navigate(to)} />
        </div>
      )}

      {currentView === 'admin' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <AdminPanel onNavigate={(to) => navigate(to)} onOpenEdit={openAdminEdit} />
        </div>
      )}

      {currentView === 'admin-edit' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <AdminEditUser appId={adminEditAppId ?? ''} onBack={closeAdminEdit} />
        </div>
      )}

      {currentView === 'profile' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <UserProfile
            onNavigate={(to) => navigate(to)}
            onLogout={handleUserLogout}
          />
        </div>
      )}

      {currentView === 'my-information' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <MyInformation onBack={() => navigate('profile')} onNavigate={(to) => navigate(to)} />
        </div>
      )}

      {currentView === 'my-information-id' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <MyInformationId onBack={() => navigate('my-information')} />
        </div>
      )}

      {currentView === 'my-information-contact' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <MyInformationContact onBack={() => navigate('my-information')} />
        </div>
      )}

      {currentView === 'my-information-bank' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <MyInformationBank onBack={() => navigate('my-information')} />
        </div>
      )}

      {currentView === 'my-information-signature' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <MyInformationSignature onBack={() => navigate('my-information')} />
        </div>
      )}

      {currentView === 'loan-contract' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <LoanContract onBack={() => navigate('profile')} />
        </div>
      )}

      {currentView === 'offers' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <OffersPage onBack={() => navigate('dashboard')} onApply={() => navigate('loan-application')} />
        </div>
      )}

      {currentView === 'exchange-rates' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <ExchangeRatesPage onBack={() => navigate('dashboard')} />
        </div>
      )}

      {currentView === 'deposit-rates' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <DepositRatesPage onBack={() => navigate('dashboard')} />
        </div>
      )}

      {currentView === 'live-chat' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <LiveChat onBack={() => navigate(getSession()?.isLoggedIn ? 'profile' : 'dashboard')} />
        </div>
      )}

      {currentView === 'auth' && (
        <AuthPage onLogin={handleAuthLogin} onGoRegister={() => setCurrentView('register')} />
      )}
    </Layout>
  );
}

export default App;
