export type Gender = 'Male' | 'Female';

export type LoanStatus = 'under_review' | 'approved' | 'rejected';

export type User = {
  id: string;
  gender: Gender;
  phoneOrEmail: string;
  password: string;
  inviteCode: string;
  disabledLogin?: boolean;
  createdAt: number;
  lastApplicationId?: string;
};

export type LoanDetails = {
  amount: number;
  termMonths: number;
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
};

export type Application = {
  id: string;
  userId: string;
  status: LoanStatus;
  statusLabel?: string;
  statusNote?: string;
  submittedAt: number;
  applicant: {
    fullName: string;
    idCardNumber: string;
    dateOfIssue: string;
    placeOfIssue: string;
  };
  contact: {
    currentAddress: string;
    currentJob: string;
    workAddress: string;
    position: string;
    monthlyIncome: string;
  };
  bank: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
  };
  documents: {
    idFrontName: string;
    idBackName: string;
    selfieHoldingIdName: string;
    signatureDataUrl: string;
    idFrontDataUrl?: string;
    idBackDataUrl?: string;
    selfieHoldingIdDataUrl?: string;
  };
  loan: LoanDetails;
  withdrawCode?: string;
  approvedAt?: number;
};

export type Balance = {
  currentBalance: number;
  withdrawnAmount: number;
};

export type SessionState = {
  isLoggedIn: boolean;
  userId: string;
  lastLoginAt: number;
};

export type AdminSession = {
  isAdmin: boolean;
  lastLoginAt: number;
};

export type Db = {
  users: Record<string, User>;
  applications: Record<string, Application>;
  balances: Record<string, Balance>;
  session: SessionState | null;
  admin: {
    pin: string;
    session: AdminSession | null;
  };
};

const DB_KEY = 'take_easy_loan_db';

const USER_KEY = 'take_easy_loan_user';
const APP_KEY = 'take_easy_loan_application';
const SESSION_KEY = 'take_easy_loan_session';

const defaultDb = (): Db => ({
  users: {},
  applications: {},
  balances: {},
  session: null,
  admin: {
    pin: '123456',
    session: null,
  },
});

export const getDb = (): Db => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultDb();
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || typeof parsed !== 'object') return defaultDb();
    return {
      ...defaultDb(),
      ...parsed,
      admin: {
        ...defaultDb().admin,
        ...(parsed.admin ?? {}),
      },
    };
  } catch {
    return defaultDb();
  }
};

export const saveDb = (db: Db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const ensureMigration = () => {
  const db = getDb();
  let changed = false;

  if (!db.session) {
    try {
      const rawSession = localStorage.getItem(SESSION_KEY);
      if (rawSession) {
        const session = JSON.parse(rawSession) as SessionState;
        if (session?.isLoggedIn && session.userId) {
          db.session = session;
          changed = true;
        }
      }
    } catch {
      // ignore
    }
  }

  let migratedUserId: string | null = null;
  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (rawUser) {
      const u = JSON.parse(rawUser) as Partial<User> & { phoneOrEmail?: string; password?: string };
      if (u?.phoneOrEmail && u.password) {
        const existing = Object.values(db.users).find(
          (x) => x.phoneOrEmail.toLowerCase() === u.phoneOrEmail!.toLowerCase(),
        );
        if (existing) {
          migratedUserId = existing.id;
        } else {
          const id = (u.id as string) || `USR-${Date.now().toString(36)}`;
          db.users[id] = {
            id,
            gender: (u.gender as Gender) || 'Male',
            phoneOrEmail: u.phoneOrEmail,
            password: u.password,
            inviteCode: (u.inviteCode as string) || '',
            disabledLogin: (u.disabledLogin as boolean) || false,
            createdAt: (u.createdAt as number) || Date.now(),
          };
          migratedUserId = id;
          changed = true;
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const rawApp = localStorage.getItem(APP_KEY);
    if (rawApp) {
      const a = JSON.parse(rawApp) as Partial<Application> & { id?: string; status?: LoanStatus; submittedAt?: number };
      const userId =
        (a.userId as string) ||
        db.session?.userId ||
        migratedUserId ||
        Object.keys(db.users)[0] ||
        null;
      if (userId && a.id && a.status && a.submittedAt && a.loan && a.applicant && a.contact && a.bank && a.documents) {
        if (!db.applications[a.id]) {
          db.applications[a.id] = { ...(a as Application), userId };
          if (db.users[userId]) db.users[userId].lastApplicationId = a.id;
          if (!db.balances[userId]) db.balances[userId] = { currentBalance: 0, withdrawnAmount: 0 };
          changed = true;
        }
      }
    }
  } catch {
    // ignore
  }

  for (const app of Object.values(db.applications)) {
    const legacy = app as unknown as {
      userId?: unknown;
      documents?: Record<string, unknown>;
    };

    if (!legacy.userId || legacy.userId === 'undefined') {
      const match = Object.values(db.users).find((u) => u.lastApplicationId === app.id);
      if (match) {
        (app as unknown as { userId: string }).userId = match.id;
        changed = true;
      } else if (Object.keys(db.users).length === 1) {
        const only = Object.keys(db.users)[0]!;
        (app as unknown as { userId: string }).userId = only;
        db.users[only]!.lastApplicationId = app.id;
        changed = true;
      }
    }

    const docs = legacy.documents;
    if (docs && typeof docs === 'object') {
      const setIfEmpty = (key: keyof Application['documents'], value: unknown) => {
        const cur = (app.documents as Record<string, unknown>)[key as string];
        if (cur) return;
        if (typeof value === 'string' && value.startsWith('data:')) {
          (app.documents as Record<string, unknown>)[key as string] = value;
          changed = true;
        }
      };

      setIfEmpty('idFrontDataUrl', docs.idFrontDataURL);
      setIfEmpty('idBackDataUrl', docs.idBackDataURL);
      setIfEmpty('selfieHoldingIdDataUrl', docs.selfieHoldingIdDataURL);
      setIfEmpty('signatureDataUrl', docs.signatureDataURL);
    }
  }

  if (changed) saveDb(db);
};

export const getSession = (): SessionState | null => getDb().session;

export const setSession = (session: SessionState | null) => {
  const db = getDb();
  db.session = session;
  saveDb(db);
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const db = getDb();
  const session = db.session;
  if (!session?.isLoggedIn) return null;
  return db.users[session.userId] ?? null;
};

export const findUserByLogin = (loginId: string): User | null => {
  const db = getDb();
  const normalized = loginId.trim().toLowerCase();
  const user = Object.values(db.users).find((u) => u.phoneOrEmail.trim().toLowerCase() === normalized);
  return user ?? null;
};

export const findApplicationByIdCardNumber = (idCardNumber: string): Application | null => {
  const db = getDb();
  const normalized = idCardNumber.replace(/\s+/g, '').trim().toLowerCase();
  if (!normalized) return null;
  const app = Object.values(db.applications).find(
    (a) => a.applicant?.idCardNumber?.replace(/\s+/g, '').trim().toLowerCase() === normalized,
  );
  return app ?? null;
};

export const upsertUser = (user: User) => {
  const db = getDb();
  db.users[user.id] = user;
  if (!db.balances[user.id]) db.balances[user.id] = { currentBalance: 0, withdrawnAmount: 0 };
  saveDb(db);
};

export const getUserBalance = (userId: string): Balance => {
  const db = getDb();
  return db.balances[userId] ?? { currentBalance: 0, withdrawnAmount: 0 };
};

export const setUserBalance = (userId: string, balance: Balance) => {
  const db = getDb();
  db.balances[userId] = balance;
  saveDb(db);
};

export const upsertApplication = (app: Application) => {
  const db = getDb();
  db.applications[app.id] = app;
  const user = db.users[app.userId];
  if (user) user.lastApplicationId = app.id;
  saveDb(db);
};

export const getLatestApplicationForUser = (userId: string): Application | null => {
  const db = getDb();
  const user = db.users[userId];
  if (user?.lastApplicationId && db.applications[user.lastApplicationId]) return db.applications[user.lastApplicationId];
  const apps = Object.values(db.applications).filter((a) => a.userId === userId);
  apps.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
  return apps[0] ?? null;
};

export const setAdminSession = (isAdmin: boolean) => {
  const db = getDb();
  db.admin.session = isAdmin ? { isAdmin: true, lastLoginAt: Date.now() } : null;
  saveDb(db);
};

export const isAdminLoggedIn = (): boolean => {
  const db = getDb();
  return !!db.admin.session?.isAdmin;
};

export const verifyAdminPin = (pin: string): boolean => {
  const db = getDb();
  return pin.trim() === db.admin.pin;
};

export const setAdminPin = (pin: string) => {
  const db = getDb();
  db.admin.pin = pin;
  saveDb(db);
};
