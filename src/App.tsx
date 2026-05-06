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
import { TopBar } from './components/TopBar';
import { UserProfile } from './components/UserProfile';
import { MyInformation } from './components/MyInformation';
import { MyInformationId } from './components/MyInformationId';
import { MyInformationContact } from './components/MyInformationContact';
import { MyInformationBank } from './components/MyInformationBank';
import { MyInformationSignature } from './components/MyInformationSignature';
import { LoanContract } from './components/LoanContract';
import { TermsAndConditionsPage } from './components/TermsAndConditionsPage';
import { AppointmentPage } from './components/AppointmentPage';
import { LiveChat } from './components/LiveChat';
import { OffersPage } from './components/OffersPage';
import { ExchangeRatesPage } from './components/ExchangeRatesPage';
import { DepositRatesPage } from './components/DepositRatesPage';
import { WebsiteNotWorking } from './components/WebsiteNotWorking';
import { Modal } from './components/Modal';
import { Button } from './components/ui/Button';
import { applicationsApi, publicApi, usersApi, type PageErrors } from './lib/api';
import {
  ensureMigration,
  getCurrentUser,
  getDb,
  getLatestApplicationForUser,
  getSession,
  setUserBalance,
  setSession,
  upsertApplication,
  upsertUser,
} from './lib/db';

export type View =
  | 'dashboard'
  | 'register'
  | 'loan-application'
  | 'application-status'
  | 'withdraw'
  | 'auth'
  | 'admin'
  | 'admin-edit'
  | 'profile'
  | 'my-information'
  | 'my-information-id'
  | 'my-information-contact'
  | 'my-information-bank'
  | 'my-information-signature'
  | 'loan-contract'
  | 'terms-and-conditions'
  | 'appointment'
  | 'offers'
  | 'exchange-rates'
  | 'deposit-rates'
  | 'live-chat';

const VIEW_KEY = 'take_easy_loan_current_view';
const DEFAULT_PUBLIC_PATH_PREFIX = '/online-ca';
const ADMIN_PATH = '/drugload-admin';
const AGENT_PATH = '/drugload-agent';
const TERMS_ACCEPTED_KEY_PREFIX = 'take_easy_loan_terms_accepted_user_';

const normalizePath = (pathname: string) => {
  const p = String(pathname || '/').trim();
  const normalized = p.replace(/\/+$/, '') || '/';
  return normalized;
};

const isAllowedPublicPath = (pathname: string) => {
  const p = normalizePath(pathname);
  if (p === DEFAULT_PUBLIC_PATH_PREFIX) return true;
  if (p === ADMIN_PATH) return true;
  if (p === AGENT_PATH) return true;
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
    'admin-edit',
    'profile',
    'my-information',
    'my-information-id',
    'my-information-contact',
    'my-information-bank',
    'my-information-signature',
    'loan-contract',
    'terms-and-conditions',
    'appointment',
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
      const p = normalizePath(window.location.pathname || '/');
      return p === DEFAULT_PUBLIC_PATH_PREFIX ? DEFAULT_PUBLIC_PATH_PREFIX : DEFAULT_PUBLIC_PATH_PREFIX;
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
      const p = normalizePath(window.location.pathname || '/');
      if (p === ADMIN_PATH) return 'admin';
      if (p === AGENT_PATH) return 'admin';
      const urlView = new URLSearchParams(window.location.search).get('view');
      if (urlView === 'agent') return 'admin';
      if (urlView && isView(urlView)) return urlView;
      const raw = localStorage.getItem(VIEW_KEY);
      if (raw === 'agent') return 'admin';
      return raw && isView(raw) ? raw : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [pageErrors, setPageErrors] = useState<PageErrors>({});
  const [dismissedPageErrorKey, setDismissedPageErrorKey] = useState('');

  useEffect(() => {
    ensureMigration();
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const session = getSession();
      const userId = session?.isLoggedIn ? session.userId : '';
      publicApi
        .getSettings(userId)
        .then((res) => {
          if (!alive) return;
          setPageErrors(res.pageErrors || {});
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setDismissedPageErrorKey('');
  }, [currentView]);

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
          view === 'loan-contract' ||
          view === 'terms-and-conditions') &&
        !session?.isLoggedIn
      ) {
        setCurrentView('auth');
        return;
      }

      if (view === 'loan-application' && !user) {
        setCurrentView('register');
        return;
      }

      if (view === 'loan-application' && session?.isLoggedIn) {
        try {
          const accepted = localStorage.getItem(`${TERMS_ACCEPTED_KEY_PREFIX}${session.userId}`) === '1';
          if (!accepted) {
            setCurrentView('register');
            return;
          }
        } catch {
          setCurrentView('register');
          return;
        }
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
    const session = getSession();
    if (!session?.isLoggedIn) return;
    if (currentView !== 'loan-application') return;
    try {
      const accepted = localStorage.getItem(`${TERMS_ACCEPTED_KEY_PREFIX}${session.userId}`) === '1';
      if (!accepted) setCurrentView('register');
    } catch {
      setCurrentView('register');
    }
  }, [currentView]);

  useEffect(() => {
    if (blockedPath) return;
    localStorage.setItem(VIEW_KEY, currentView);
    const url = new URL(window.location.href);
    if (currentView === 'admin') {
      url.pathname = ADMIN_PATH;
      url.searchParams.delete('view');
    } else {
      url.pathname = publicBasePath;
      url.searchParams.set('view', currentView);
    }
    if (currentView === 'admin-edit' && adminEditAppId) url.searchParams.set('appId', adminEditAppId);
    else url.searchParams.delete('appId');
    window.history.replaceState({}, '', url.toString());
  }, [adminEditAppId, blockedPath, currentView]);

  useEffect(() => {
    if (currentView !== 'loan-application' && currentView !== 'application-status' && currentView !== 'withdraw') return;
    const session = getSession();
    if (!session?.isLoggedIn) setCurrentView('auth');
  }, [currentView]);

  useEffect(() => {
    const session = getSession();
    if (!session?.isLoggedIn) return;
    if (
      currentView !== 'profile' &&
      currentView !== 'application-status' &&
      currentView !== 'withdraw' &&
      currentView !== 'my-information' &&
      currentView !== 'my-information-id' &&
      currentView !== 'my-information-contact' &&
      currentView !== 'my-information-bank' &&
      currentView !== 'my-information-signature' &&
      currentView !== 'loan-contract' &&
      currentView !== 'appointment'
    ) {
      return;
    }
    const userId = session.userId;
    Promise.allSettled([
      usersApi
        .getUser(userId)
        .then((res) => {
          const existing = getDb().users[userId];
          const next = res.user;
          if (next.disabledLogin) {
            setSession(null);
            try {
              localStorage.setItem('take_easy_loan_blocked_notice', 'Your account is blocked. Please contact customer service.');
            } catch {
            }
            setCurrentView('auth');
            return;
          }
          upsertUser({
            id: next.id,
            gender: (next.gender as never) || existing?.gender || 'Male',
            phoneOrEmail: next.phoneOrEmail,
            password: existing?.password || '',
            inviteCode: next.inviteCode || existing?.inviteCode || '',
            createdAt: next.createdAt || existing?.createdAt || Date.now(),
            lastApplicationId: next.lastApplicationId,
            disabledLogin: !!next.disabledLogin,
          });
        })
        .catch(() => {
          setSession(null);
          try {
            localStorage.setItem('take_easy_loan_blocked_notice', 'Your account was removed. Please register again.');
          } catch {
          }
          setCurrentView('auth');
        }),
      applicationsApi.getLatest(userId).then((res) => {
        if (res.application) upsertApplication(res.application as never);
      }),
      usersApi.getBalance(userId).then((res) => {
        setUserBalance(userId, res.balance);
      }),
    ]).catch(() => {});
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
        <WebsiteNotWorking />
      </Layout>
    );
  }

  const currentPageError = pageErrors[currentView];
  const pageErrorText =
    currentView !== 'admin' && currentView !== 'admin-edit' && currentPageError?.enabled
      ? String(currentPageError.message || '').trim()
      : '';
  const activePageErrorKey = pageErrorText ? `${currentView}:${pageErrorText}` : '';

  return (
    <Layout
      onNavigate={navigate}
      hideHeader
      hideFooter
    >
      <TopBar onNavigate={navigate} showLogout={!!getSession()?.isLoggedIn} onLogout={handleUserLogout} />

      <Modal
        open={!!pageErrorText && dismissedPageErrorKey !== activePageErrorKey}
        title="Error"
        onClose={() => setDismissedPageErrorKey(activePageErrorKey)}
        maxWidthClassName="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 whitespace-pre-wrap">
            {pageErrorText}
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0b4a90] text-sm font-extrabold text-white hover:bg-[#093b74]"
            onClick={() => setDismissedPageErrorKey(activePageErrorKey)}
          >
            OK
          </Button>
        </div>
      </Modal>

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

      {currentView === 'terms-and-conditions' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <TermsAndConditionsPage onBack={() => navigate('profile')} />
        </div>
      )}

      {currentView === 'appointment' && (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)]">
          <AppointmentPage onBack={() => navigate('profile')} />
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
