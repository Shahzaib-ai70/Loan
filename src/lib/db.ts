export type Gender = 'Male' | 'Female';

export type LoanStatus = 'under_review' | 'approved' | 'rejected';

export type User = {
  id: string;
  gender: Gender;
  phoneOrEmail: string;
  password: string;
  inviteCode: string;
  agentId?: string;
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
  withdrawError?: string;
  withdrawErrorMedia?: string;
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
const ADMIN_PIN_KEY = 'take_easy_loan_admin_pin';
const ADMIN_SESSION_KEY = 'take_easy_loan_admin_session';

const defaultDb = (): Db => ({
  users: {},
  applications: {},
  balances: {},
  session: null,
  admin: {
    pin: '568367',
    session: null,
  },
});

const pruneHeavyDocuments = (app: Application, mode: 'light' | 'full'): Application => {
  const nextDocs: Application['documents'] = { ...app.documents };
  const front = String(nextDocs.idFrontDataUrl || '');
  const back = String(nextDocs.idBackDataUrl || '');
  const selfie = String(nextDocs.selfieHoldingIdDataUrl || '');
  if (front.length > 80_000) nextDocs.idFrontDataUrl = undefined;
  if (back.length > 80_000) nextDocs.idBackDataUrl = undefined;
  if (selfie.length > 80_000) nextDocs.selfieHoldingIdDataUrl = undefined;
  if (mode === 'full') {
    nextDocs.signatureDataUrl = '';
  } else {
    const sig = String(nextDocs.signatureDataUrl || '');
    if (sig.length > 120_000) nextDocs.signatureDataUrl = '';
  }
  return { ...app, documents: nextDocs };
};

export const getDb = (): Db => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const base = (() => {
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
    })();

    try {
      const rawAdminPin = localStorage.getItem(ADMIN_PIN_KEY);
      if (rawAdminPin && rawAdminPin.trim()) base.admin.pin = rawAdminPin.trim();
    } catch {
    }

    try {
      const rawAdminSession = localStorage.getItem(ADMIN_SESSION_KEY);
      if (rawAdminSession) {
        const session = JSON.parse(rawAdminSession) as AdminSession;
        if (session?.isAdmin) base.admin.session = session;
      }
    } catch {
    }

    return base;
  } catch {
    return defaultDb();
  }
};

export const saveDb = (db: Db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    const quota =
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('exceeded') ||
      message.toLowerCase().includes('storage');
    if (!quota) throw e;
    try {
      const pruned: Db = {
        ...db,
        applications: Object.fromEntries(
          Object.entries(db.applications).map(([id, app]) => [id, pruneHeavyDocuments(app, 'full')]),
        ),
      };
      localStorage.setItem(DB_KEY, JSON.stringify(pruned));
    } catch {
    }
  }
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
      const docObj = docs as Record<string, unknown>;
      const front = String(docObj.idFrontDataUrl || docObj.idFrontDataURL || '');
      const back = String(docObj.idBackDataUrl || docObj.idBackDataURL || '');
      const selfie = String(docObj.selfieHoldingIdDataUrl || docObj.selfieHoldingIdDataURL || '');
      const sig = String(docObj.signatureDataUrl || docObj.signatureDataURL || '');
      const hasHeavy = front.length > 80_000 || back.length > 80_000 || selfie.length > 80_000 || sig.length > 120_000;
      if (hasHeavy) {
        db.applications[app.id] = pruneHeavyDocuments(app, 'light');
        changed = true;
      }
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

export const applyAdminSnapshot = (payload: {
  users: User[];
  applications: Application[];
  balances: Record<string, Balance>;
}) => {
  const db = getDb();
  for (const user of payload.users) {
    db.users[user.id] = user;
    if (!db.balances[user.id]) db.balances[user.id] = { currentBalance: 0, withdrawnAmount: 0 };
  }
  const latestByUserId: Record<string, Application> = {};
  for (const app of payload.applications) {
    const userId = app.userId;
    if (!userId) continue;
    const current = latestByUserId[userId];
    const nextSubmitted = Number(app.submittedAt ?? 0) || 0;
    const currentSubmitted = Number(current?.submittedAt ?? 0) || 0;
    if (!current || nextSubmitted >= currentSubmitted) latestByUserId[userId] = app;
  }

  db.applications = {};
  for (const app of Object.values(latestByUserId)) {
    const pruned = pruneHeavyDocuments(app, 'light');
    db.applications[pruned.id] = pruned;
    const user = db.users[pruned.userId];
    if (user) user.lastApplicationId = pruned.id;
  }
  for (const [userId, balance] of Object.entries(payload.balances || {})) {
    db.balances[userId] = balance;
  }
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
  db.applications[app.id] = pruneHeavyDocuments(app, 'light');
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
  try {
    if (db.admin.session) localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(db.admin.session));
    else localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
  }
};

export const isAdminLoggedIn = (): boolean => {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw) as AdminSession;
      if (session?.isAdmin) return true;
    }
  } catch {
  }
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
  try {
    localStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch {
  }
};

export const deleteUserLocal = (userId: string) => {
  const db = getDb();
  const appsToDelete = Object.values(db.applications).filter((a) => a.userId === userId);
  for (const app of appsToDelete) delete db.applications[app.id];
  delete db.balances[userId];
  delete db.users[userId];
  if (db.session?.isLoggedIn && db.session.userId === userId) {
    db.session = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
    }
  }
  saveDb(db);
};
