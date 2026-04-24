import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { db, initDb, now } from './db.js';

initDb();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const normalize = (s) => String(s || '').trim().toLowerCase();
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const getAdminPin = () => {
  const row = db.prepare('SELECT pin FROM admin_settings WHERE id = 1').get();
  return row?.pin || '123456';
};

const getAdminCredentials = () => {
  const row = db.prepare('SELECT username, password_salt, password_hash FROM admin_settings WHERE id = 1').get();
  return {
    username: row?.username || 'admin',
    passwordSalt: row?.password_salt || '',
    passwordHash: row?.password_hash || '',
  };
};

const getAppSettings = () => {
  const row = db.prepare('SELECT currency_sign_enabled, currency_symbol FROM admin_settings WHERE id = 1').get();
  const enabled = row?.currency_sign_enabled === 0 ? false : true;
  const symbol = String(row?.currency_symbol || '$').trim() || '$';
  return { currencySignEnabled: enabled, currencySymbol: symbol };
};

const verifyAdminPassword = (username, password) => {
  const creds = getAdminCredentials();
  if (!creds.passwordSalt || !creds.passwordHash) return false;
  if (String(username || '').trim().toLowerCase() !== String(creds.username || '').trim().toLowerCase()) return false;
  const computed = crypto.scryptSync(String(password || ''), creds.passwordSalt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(creds.passwordHash, 'hex'));
};

const getAgentByKey = (agentKey) => {
  if (!agentKey) return null;
  return db
    .prepare('SELECT id, username, invite_code, api_key FROM agents WHERE api_key = ?')
    .get(String(agentKey).trim());
};

const requireAdmin = (req, res, next) => {
  const pin = req.headers['x-admin-pin'];
  if (!pin || String(pin).trim() !== getAdminPin()) {
    res.status(401).json({ message: 'Invalid admin pin' });
    return;
  }
  next();
};

const requireAgent = (req, res, next) => {
  const key = req.headers['x-agent-key'];
  const agent = getAgentByKey(key);
  if (!agent) {
    res.status(401).json({ message: 'Invalid agent session' });
    return;
  }
  req.agent = agent;
  next();
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'loan-app-backend' });
});

app.post('/api/auth/register', (req, res) => {
  const { gender = 'Male', phoneOrEmail = '', password = '', inviteCode = '' } = req.body || {};
  if (!phoneOrEmail || !password) {
    res.status(400).json({ message: 'Phone/Email and password are required.' });
    return;
  }
  const inv = String(inviteCode || '').trim();
  if (!inv) {
    res.status(400).json({ message: 'Invite Code is required.' });
    return;
  }
  const superInvite = String(process.env.SUPER_ADMIN_INVITE_CODE || '12345678').trim();
  const isSuperInvite = normalize(inv) === normalize(superInvite);
  const agent = db.prepare('SELECT id FROM agents WHERE invite_code = ?').get(inv);
  if (!agent && !isSuperInvite) {
    res.status(400).json({ message: 'Invalid invite code.' });
    return;
  }

  const exists = db
    .prepare('SELECT id FROM users WHERE lower(phone_or_email) = ?')
    .get(normalize(phoneOrEmail));
  if (exists) {
    res.status(409).json({ message: 'Account already exists.' });
    return;
  }

  const id = makeId('USR');
  db.prepare(
    `INSERT INTO users (id, gender, phone_or_email, password, invite_code, created_at, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, gender, String(phoneOrEmail).trim(), String(password), inv, now(), agent?.id || null);
  db.prepare('INSERT OR IGNORE INTO balances (user_id, current_balance, withdrawn_amount) VALUES (?, 0, 0)').run(id);

  res.json({
    user: { id, gender, phoneOrEmail: String(phoneOrEmail).trim(), createdAt: now(), agentId: agent?.id || undefined },
    session: { isLoggedIn: true, userId: id, lastLoginAt: now() },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { loginId = '', password = '' } = req.body || {};
  const user = db
    .prepare(
      'SELECT id, gender, phone_or_email, password, created_at, last_application_id, agent_id, invite_code, disabled_login FROM users WHERE lower(phone_or_email) = ?',
    )
    .get(normalize(loginId));
  if (!user || user.password !== String(password)) {
    res.status(401).json({ message: 'Invalid login details.' });
    return;
  }
  if (Number(user.disabled_login || 0) === 1) {
    res.status(403).json({ message: 'Login disabled. Please contact support.' });
    return;
  }

  const appRow = user.last_application_id
    ? db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(user.last_application_id)
    : null;
  const latestApplication = appRow ? JSON.parse(appRow.payload_json) : null;

  res.json({
    user: {
      id: user.id,
      gender: user.gender,
      phoneOrEmail: user.phone_or_email,
      createdAt: user.created_at,
      lastApplicationId: user.last_application_id || undefined,
      agentId: user.agent_id || undefined,
      inviteCode: user.invite_code || undefined,
      disabledLogin: Number(user.disabled_login || 0) === 1,
    },
    latestApplication,
    session: { isLoggedIn: true, userId: user.id, lastLoginAt: now() },
  });
});

app.post('/api/applications', (req, res) => {
  const payload = req.body || {};
  const userId = payload.userId;
  if (!userId) {
    res.status(400).json({ message: 'userId is required.' });
    return;
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  const id = payload.id || makeId('APP');
  const appObj = {
    ...payload,
    id,
    submittedAt: payload.submittedAt || now(),
    status: payload.status || 'under_review',
    withdrawCodeUsedAt: payload.withdrawCodeUsedAt || null,
  };

  db.prepare(
    `INSERT OR REPLACE INTO applications (id, user_id, status, submitted_at, approved_at, withdraw_code, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    appObj.status,
    appObj.submittedAt,
    appObj.approvedAt || null,
    appObj.withdrawCode || null,
    JSON.stringify(appObj),
  );
  db.prepare('UPDATE users SET last_application_id = ? WHERE id = ?').run(id, userId);
  db.prepare('INSERT OR IGNORE INTO balances (user_id, current_balance, withdrawn_amount) VALUES (?, 0, 0)').run(userId);

  res.json({ application: appObj });
});

app.get('/api/applications/latest/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db.prepare('SELECT last_application_id FROM users WHERE id = ?').get(userId);
  if (!user || !user.last_application_id) {
    res.json({ application: null });
    return;
  }
  const row = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(user.last_application_id);
  res.json({ application: row ? JSON.parse(row.payload_json) : null });
});

app.get('/api/users/:userId/balance', (req, res) => {
  const row = db.prepare('SELECT current_balance, withdrawn_amount FROM balances WHERE user_id = ?').get(req.params.userId);
  res.json({
    balance: {
      currentBalance: row?.current_balance || 0,
      withdrawnAmount: row?.withdrawn_amount || 0,
    },
  });
});

app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db
    .prepare(
      'SELECT id, gender, phone_or_email, created_at, last_application_id, agent_id, invite_code, disabled_login FROM users WHERE id = ?',
    )
    .get(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      gender: user.gender,
      phoneOrEmail: user.phone_or_email,
      createdAt: user.created_at,
      lastApplicationId: user.last_application_id || undefined,
      agentId: user.agent_id || undefined,
      inviteCode: user.invite_code || undefined,
      disabledLogin: Number(user.disabled_login || 0) === 1,
    },
  });
});

app.put('/api/users/:userId/balance', requireAdmin, (req, res) => {
  const amount = Number(req.body?.currentBalance || 0);
  const old = db.prepare('SELECT withdrawn_amount FROM balances WHERE user_id = ?').get(req.params.userId);
  db.prepare(
    `INSERT INTO balances (user_id, current_balance, withdrawn_amount)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET current_balance = excluded.current_balance`,
  ).run(req.params.userId, Math.max(0, amount), old?.withdrawn_amount || 0);
  res.json({ ok: true });
});

app.post('/api/withdraw', (req, res) => {
  const { userId = '', code = '' } = req.body || {};
  const user = db.prepare('SELECT last_application_id FROM users WHERE id = ?').get(userId);
  if (!user?.last_application_id) {
    res.status(404).json({ message: 'No application found.' });
    return;
  }
  const appRow = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(user.last_application_id);
  if (!appRow) {
    res.status(404).json({ message: 'Application missing.' });
    return;
  }
  const appPayload = JSON.parse(appRow.payload_json);
  if (appPayload.status !== 'approved') {
    res.status(400).json({ message: 'Loan is not approved yet.' });
    return;
  }
  const manualError = String(appPayload.withdrawError || '').trim();
  if (manualError) {
    res.status(400).json({ message: manualError });
    return;
  }
  const expected = String(appPayload.withdrawCode || '').trim();
  const provided = String(code || '').trim();
  if (!expected) {
    res.status(400).json({ message: 'Withdraw code not assigned yet. Please request a new OTP.' });
    return;
  }
  if (provided !== expected) {
    res.status(400).json({ message: 'Invalid or expired withdrawal code.' });
    return;
  }
  if (appPayload.withdrawCodeUsedAt) {
    res.status(400).json({ message: 'Withdraw OTP already used. Please request a new OTP.' });
    return;
  }
  const bal = db.prepare('SELECT current_balance, withdrawn_amount FROM balances WHERE user_id = ?').get(userId);
  const current = Number(bal?.current_balance || 0);
  if (current <= 0) {
    res.status(400).json({ message: 'No balance available.' });
    return;
  }
  const withdrawn = Number(bal?.withdrawn_amount || 0) + current;
  db.prepare('UPDATE balances SET current_balance = 0, withdrawn_amount = ? WHERE user_id = ?').run(withdrawn, userId);
  const updated = { ...appPayload, withdrawCodeUsedAt: now() };
  db.prepare('UPDATE applications SET payload_json = ? WHERE id = ?').run(JSON.stringify(updated), user.last_application_id);
  res.json({
    message: 'Withdraw successful',
    amount: current,
    balance: { currentBalance: 0, withdrawnAmount: withdrawn },
  });
});

app.post('/api/admin/login', (req, res) => {
  const { pin = '', username = '', password = '' } = req.body || {};
  if (String(pin).trim()) {
    if (String(pin).trim() !== getAdminPin()) {
      res.status(401).json({ message: 'Invalid admin pin.' });
      return;
    }
    res.json({ ok: true, adminPin: String(pin).trim() });
    return;
  }

  if (!verifyAdminPassword(username, password)) {
    res.status(401).json({ message: 'Invalid admin login.' });
    return;
  }
  res.json({ ok: true, adminPin: getAdminPin() });
});

app.post('/api/agent/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const u = String(username || '').trim();
  const p = String(password || '');
  if (!u || !p) {
    res.status(400).json({ message: 'Username and password are required.' });
    return;
  }
  const agent = db
    .prepare(
      'SELECT id, username, password, invite_code, api_key, created_at FROM agents WHERE lower(username) = ? OR invite_code = ?',
    )
    .get(normalize(u), u);
  if (!agent || String(agent.password) !== p) {
    res.status(401).json({ message: 'Invalid agent login.' });
    return;
  }
  res.json({
    ok: true,
    agentKey: agent.api_key,
    agent: { id: agent.id, username: agent.username, inviteCode: agent.invite_code, createdAt: agent.created_at },
  });
});

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const users = db
    .prepare(
      'SELECT id, gender, phone_or_email, created_at, last_application_id, agent_id, invite_code, disabled_login FROM users ORDER BY created_at DESC',
    )
    .all();
  const applicationsRows = db.prepare('SELECT payload_json FROM applications ORDER BY submitted_at DESC').all();
  const applications = applicationsRows.map((r) => JSON.parse(r.payload_json));
  const balancesRows = db.prepare('SELECT user_id, current_balance, withdrawn_amount FROM balances').all();
  const balances = Object.fromEntries(
    balancesRows.map((b) => [
      b.user_id,
      { currentBalance: b.current_balance, withdrawnAmount: b.withdrawn_amount },
    ]),
  );
  res.json({
    users: users.map((u) => ({
      id: u.id,
      gender: u.gender,
      phoneOrEmail: u.phone_or_email,
      createdAt: u.created_at,
      lastApplicationId: u.last_application_id,
      agentId: u.agent_id || undefined,
      inviteCode: u.invite_code || undefined,
      disabledLogin: Number(u.disabled_login || 0) === 1,
    })),
    applications,
    balances,
  });
});

app.get('/api/admin/agents', requireAdmin, (_req, res) => {
  const agents = db.prepare('SELECT id, username, password, invite_code, created_at FROM agents ORDER BY created_at DESC').all();
  const counts = db
    .prepare('SELECT agent_id, COUNT(*) as total FROM users WHERE agent_id IS NOT NULL GROUP BY agent_id')
    .all();
  const totals = Object.fromEntries(counts.map((c) => [c.agent_id, c.total]));
  res.json({
    agents: agents.map((a) => ({
      id: a.id,
      username: a.username,
      password: a.password,
      inviteCode: a.invite_code,
      createdAt: a.created_at,
      totalCustomers: totals[a.id] || 0,
    })),
  });
});

app.post('/api/admin/agents', requireAdmin, (req, res) => {
  const { username = '', password = '', inviteCode = '' } = req.body || {};
  const u = String(username || '').trim();
  const p = String(password || '');
  const inv = String(inviteCode || '').trim();
  if (!u || !p || !inv) {
    res.status(400).json({ message: 'username, password and inviteCode are required.' });
    return;
  }
  const existsU = db.prepare('SELECT id FROM agents WHERE lower(username) = ?').get(normalize(u));
  if (existsU) {
    res.status(409).json({ message: 'Agent username already exists.' });
    return;
  }
  const existsI = db.prepare('SELECT id FROM agents WHERE invite_code = ?').get(inv);
  if (existsI) {
    res.status(409).json({ message: 'Invite code already exists.' });
    return;
  }
  const id = makeId('AGT');
  const apiKey = crypto.randomBytes(24).toString('hex');
  db.prepare(
    `INSERT INTO agents (id, username, password, invite_code, api_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, u, p, inv, apiKey, now());
  res.json({ agent: { id, username: u, inviteCode: inv, createdAt: now() } });
});

app.get('/api/agent/overview', requireAgent, (req, res) => {
  const agent = req.agent;
  const users = db
    .prepare(
      'SELECT id, gender, phone_or_email, created_at, last_application_id, agent_id, invite_code, disabled_login FROM users WHERE agent_id = ? ORDER BY created_at DESC',
    )
    .all(agent.id);
  const applicationsRows = db
    .prepare(
      `SELECT payload_json FROM applications
       WHERE user_id IN (SELECT id FROM users WHERE agent_id = ?)
       ORDER BY submitted_at DESC`,
    )
    .all(agent.id);
  const applications = applicationsRows.map((r) => JSON.parse(r.payload_json));
  const balancesRows = db
    .prepare(
      `SELECT user_id, current_balance, withdrawn_amount FROM balances
       WHERE user_id IN (SELECT id FROM users WHERE agent_id = ?)`,
    )
    .all(agent.id);
  const balances = Object.fromEntries(
    balancesRows.map((b) => [
      b.user_id,
      { currentBalance: b.current_balance, withdrawnAmount: b.withdrawn_amount },
    ]),
  );
  res.json({
    agent: { id: agent.id, username: agent.username, inviteCode: agent.invite_code },
    users: users.map((u) => ({
      id: u.id,
      gender: u.gender,
      phoneOrEmail: u.phone_or_email,
      createdAt: u.created_at,
      lastApplicationId: u.last_application_id,
      agentId: u.agent_id || undefined,
      inviteCode: u.invite_code || undefined,
      disabledLogin: Number(u.disabled_login || 0) === 1,
    })),
    applications,
    balances,
  });
});

app.put('/api/agent/applications/:appId', requireAgent, (req, res) => {
  const agent = req.agent;
  const { appId } = req.params;
  const row = db
    .prepare(
      `SELECT a.payload_json FROM applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = ? AND u.agent_id = ?`,
    )
    .get(appId, agent.id);
  if (!row) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }
  const oldPayload = JSON.parse(row.payload_json);
  const updated = { ...oldPayload, ...req.body, id: appId };
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'withdrawCode')) {
    const oldCode = String(oldPayload.withdrawCode || '').trim();
    const nextCode = String(req.body?.withdrawCode || '').trim();
    if (oldCode !== nextCode) updated.withdrawCodeUsedAt = null;
  }
  db.prepare('UPDATE applications SET status = ?, approved_at = ?, withdraw_code = ?, payload_json = ? WHERE id = ?').run(
    updated.status || oldPayload.status,
    updated.approvedAt || oldPayload.approvedAt || null,
    updated.withdrawCode || oldPayload.withdrawCode || null,
    JSON.stringify(updated),
    appId,
  );
  res.json({ application: updated });
});

app.put('/api/agent/users/:userId/balance', requireAgent, (req, res) => {
  const agent = req.agent;
  const { userId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND agent_id = ?').get(userId, agent.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const amount = Number(req.body?.currentBalance || 0);
  const old = db.prepare('SELECT withdrawn_amount FROM balances WHERE user_id = ?').get(userId);
  db.prepare(
    `INSERT INTO balances (user_id, current_balance, withdrawn_amount)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET current_balance = excluded.current_balance`,
  ).run(userId, Math.max(0, amount), old?.withdrawn_amount || 0);
  res.json({ ok: true });
});

app.patch('/api/agent/users/:userId', requireAgent, (req, res) => {
  const agent = req.agent;
  const { userId } = req.params;
  const user = db
    .prepare(
      'SELECT id, gender, phone_or_email, password, invite_code, created_at, last_application_id, agent_id, disabled_login FROM users WHERE id = ? AND agent_id = ?',
    )
    .get(userId, agent.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const nextGender = String(req.body?.gender || user.gender);
  const nextPhone = String(req.body?.phoneOrEmail || user.phone_or_email).trim();
  const nextPassword = req.body?.password == null ? String(user.password) : String(req.body.password);
  const nextInviteCode = req.body?.inviteCode == null ? String(user.invite_code || '') : String(req.body.inviteCode || '');
  const nextDisabled = req.body?.disabledLogin == null ? Number(user.disabled_login || 0) : req.body.disabledLogin ? 1 : 0;
  if (!nextPhone) {
    res.status(400).json({ message: 'Phone/Email is required.' });
    return;
  }
  const existsLogin = db
    .prepare('SELECT id FROM users WHERE lower(phone_or_email) = ? AND id != ?')
    .get(normalize(nextPhone), userId);
  if (existsLogin) {
    res.status(409).json({ message: 'Phone/Email already exists.' });
    return;
  }
  db.prepare('UPDATE users SET gender = ?, phone_or_email = ?, password = ?, invite_code = ?, disabled_login = ? WHERE id = ?').run(
    nextGender,
    nextPhone,
    nextPassword,
    nextInviteCode,
    nextDisabled,
    userId,
  );
  res.json({
    user: {
      id: userId,
      gender: nextGender,
      phoneOrEmail: nextPhone,
      createdAt: user.created_at,
      lastApplicationId: user.last_application_id || undefined,
      agentId: user.agent_id || undefined,
      inviteCode: nextInviteCode || undefined,
      disabledLogin: nextDisabled === 1,
    },
  });
});

app.patch('/api/admin/users/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  const user = db
    .prepare(
      'SELECT id, gender, phone_or_email, password, invite_code, created_at, last_application_id, agent_id, disabled_login FROM users WHERE id = ?',
    )
    .get(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const nextGender = String(req.body?.gender || user.gender);
  const nextPhone = String(req.body?.phoneOrEmail || user.phone_or_email).trim();
  const nextPassword = req.body?.password == null ? String(user.password) : String(req.body.password);
  const nextInviteCode = req.body?.inviteCode == null ? String(user.invite_code || '') : String(req.body.inviteCode || '');
  const nextDisabled = req.body?.disabledLogin == null ? Number(user.disabled_login || 0) : req.body.disabledLogin ? 1 : 0;
  if (!nextPhone) {
    res.status(400).json({ message: 'Phone/Email is required.' });
    return;
  }
  const existsLogin = db
    .prepare('SELECT id FROM users WHERE lower(phone_or_email) = ? AND id != ?')
    .get(normalize(nextPhone), userId);
  if (existsLogin) {
    res.status(409).json({ message: 'Phone/Email already exists.' });
    return;
  }
  db.prepare('UPDATE users SET gender = ?, phone_or_email = ?, password = ?, invite_code = ?, disabled_login = ? WHERE id = ?').run(
    nextGender,
    nextPhone,
    nextPassword,
    nextInviteCode,
    nextDisabled,
    userId,
  );
  res.json({
    user: {
      id: userId,
      gender: nextGender,
      phoneOrEmail: nextPhone,
      createdAt: user.created_at,
      lastApplicationId: user.last_application_id || undefined,
      agentId: user.agent_id || undefined,
      inviteCode: nextInviteCode || undefined,
      disabledLogin: nextDisabled === 1,
    },
  });
});

app.delete('/api/agent/users/:userId', requireAgent, (req, res) => {
  const agent = req.agent;
  const { userId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND agent_id = ?').get(userId, agent.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  db.prepare('DELETE FROM applications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM balances WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  db.prepare('DELETE FROM applications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM balances WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ ok: true });
});

app.put('/api/admin/applications/:appId', requireAdmin, (req, res) => {
  const { appId } = req.params;
  const row = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(appId);
  if (!row) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }
  const oldPayload = JSON.parse(row.payload_json);
  const updated = { ...oldPayload, ...req.body, id: appId };
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'withdrawCode')) {
    const oldCode = String(oldPayload.withdrawCode || '').trim();
    const nextCode = String(req.body?.withdrawCode || '').trim();
    if (oldCode !== nextCode) updated.withdrawCodeUsedAt = null;
  }
  db.prepare('UPDATE applications SET status = ?, approved_at = ?, withdraw_code = ?, payload_json = ? WHERE id = ?').run(
    updated.status || oldPayload.status,
    updated.approvedAt || oldPayload.approvedAt || null,
    updated.withdrawCode || oldPayload.withdrawCode || null,
    JSON.stringify(updated),
    appId,
  );
  res.json({ application: updated });
});

app.get('/api/chat/messages/:userId', (req, res) => {
  const { userId } = req.params;
  const rows = db
    .prepare('SELECT id, user_id, sender, message, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId);
  res.json({
    messages: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      sender: r.sender,
      message: r.message,
      createdAt: r.created_at,
    })),
  });
});

app.post('/api/chat/messages', (req, res) => {
  const { userId = '', message = '', phoneOrEmail = '' } = req.body || {};
  if (!userId || !String(message).trim()) {
    res.status(400).json({ message: 'userId and message are required.' });
    return;
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    const login = String(phoneOrEmail || `guest-${userId}@local`).trim();
    const existsLogin = db.prepare('SELECT id FROM users WHERE lower(phone_or_email) = ?').get(normalize(login));
    if (existsLogin) {
      res.status(409).json({ message: 'Phone/Email already exists. Please login with backend account.' });
      return;
    }
    db.prepare(
      `INSERT INTO users (id, gender, phone_or_email, password, invite_code, created_at, last_application_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, 'Male', login, 'guest', '', now(), null);
    db.prepare('INSERT OR IGNORE INTO balances (user_id, current_balance, withdrawn_amount) VALUES (?, 0, 0)').run(userId);
  }
  const id = makeId('MSG');
  db.prepare('INSERT INTO chat_messages (id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    userId,
    'user',
    String(message).trim(),
    now(),
  );
  res.json({ ok: true, id });
});

app.get('/api/chat/realtime/:userId', (req, res) => {
  const { userId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let lastSent = 0;
  const send = () => {
    const rows = db
      .prepare('SELECT id, user_id, sender, message, created_at FROM chat_messages WHERE user_id = ? AND created_at > ? ORDER BY created_at ASC')
      .all(userId, lastSent);
    if (!rows.length) return;
    lastSent = rows[rows.length - 1]?.created_at || lastSent;
    res.write(`data: ${JSON.stringify({
      messages: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        sender: r.sender,
        message: r.message,
        createdAt: r.created_at,
      })),
    })}\n\n`);
  };

  const interval = setInterval(send, 1000);
  send();
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.get('/api/admin/chat/threads', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT m.user_id as user_id, MAX(m.created_at) as last_at
       FROM chat_messages m
       GROUP BY m.user_id
       ORDER BY last_at DESC`,
    )
    .all();
  const getUser = db.prepare('SELECT id, phone_or_email FROM users WHERE id = ?');
  const getLastMsg = db.prepare('SELECT sender, message, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
  res.json({
    threads: rows.map((r) => {
      const u = getUser.get(r.user_id);
      const last = getLastMsg.get(r.user_id);
      return {
        userId: r.user_id,
        phoneOrEmail: u?.phone_or_email || '',
        lastMessage: last?.message || '',
        lastSender: last?.sender || '',
        lastAt: last?.created_at || 0,
      };
    }),
  });
});

app.get('/api/admin/chat/messages/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  const rows = db
    .prepare('SELECT id, user_id, sender, message, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId);
  res.json({
    messages: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      sender: r.sender,
      message: r.message,
      createdAt: r.created_at,
    })),
  });
});

app.get('/api/support/settings', (_req, res) => {
  const row = db
    .prepare('SELECT whatsapp_link, telegram_link, support_email, helpline FROM support_settings WHERE id = 1')
    .get();
  res.json({
    settings: {
      whatsappLink: row?.whatsapp_link || '',
      telegramLink: row?.telegram_link || '',
      supportEmail: row?.support_email || '',
      helpline: row?.helpline || '',
    },
  });
});

app.get('/api/public/settings', (_req, res) => {
  res.json({
    settings: getAppSettings(),
  });
});

app.get('/api/admin/support/settings', requireAdmin, (_req, res) => {
  const row = db
    .prepare('SELECT whatsapp_link, telegram_link, support_email, helpline FROM support_settings WHERE id = 1')
    .get();
  res.json({
    settings: {
      whatsappLink: row?.whatsapp_link || '',
      telegramLink: row?.telegram_link || '',
      supportEmail: row?.support_email || '',
      helpline: row?.helpline || '',
    },
  });
});

app.put('/api/admin/support/settings', requireAdmin, (req, res) => {
  const { whatsappLink = '', telegramLink = '', supportEmail = '', helpline = '' } = req.body || {};
  db.prepare(
    'UPDATE support_settings SET whatsapp_link = ?, telegram_link = ?, support_email = ?, helpline = ? WHERE id = 1',
  ).run(String(whatsappLink), String(telegramLink), String(supportEmail), String(helpline));
  res.json({ ok: true });
});

app.put('/api/admin/app/settings', requireAdmin, (req, res) => {
  const { currencySignEnabled, currencySymbol } = req.body || {};
  const enabled = currencySignEnabled === false ? 0 : 1;
  const symbol = String(currencySymbol || '$').trim().slice(0, 4);
  db.prepare('UPDATE admin_settings SET currency_sign_enabled = ?, currency_symbol = ? WHERE id = 1').run(enabled, symbol || '$');
  res.json({ ok: true, settings: getAppSettings() });
});

app.post('/api/admin/chat/messages/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { message = '' } = req.body || {};
  if (!String(message).trim()) {
    res.status(400).json({ message: 'message is required.' });
    return;
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    db.prepare(
      `INSERT INTO users (id, gender, phone_or_email, password, invite_code, created_at, last_application_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, 'Male', `guest-${userId}@local`, 'guest', '', now(), null);
    db.prepare('INSERT OR IGNORE INTO balances (user_id, current_balance, withdrawn_amount) VALUES (?, 0, 0)').run(userId);
  }
  const id = makeId('MSG');
  db.prepare('INSERT INTO chat_messages (id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    userId,
    'admin',
    String(message).trim(),
    now(),
  );
  res.json({ ok: true, id });
});

const parseAppointmentMessage = (message) => {
  const raw = String(message || '').trim();
  if (!raw.toUpperCase().startsWith('APPOINTMENT REQUEST')) return null;
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const getVal = (prefix) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!line) return '';
    return String(line.slice(prefix.length)).trim();
  };
  const amount = getVal('Deposit Amount:');
  const date = getVal('Date:');
  const time = getVal('Time:');
  const location = getVal('Location/Branch:');
  const note = getVal('Note:');
  const name = getVal('Name:');
  const login = getVal('Login:');
  return { amount, date, time, location, note, name, login };
};

app.get('/api/admin/appointments', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT m.id as id, m.user_id as user_id, m.message as message, m.created_at as created_at, u.phone_or_email as phone_or_email
       FROM chat_messages m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE upper(m.message) LIKE 'APPOINTMENT REQUEST%'
       ORDER BY m.created_at DESC`,
    )
    .all();

  const decisionRows = db
    .prepare(
      `SELECT id, user_id, message, created_at
       FROM chat_messages
       WHERE upper(message) LIKE 'APPOINTMENT_DECISION|%'
       ORDER BY created_at DESC`,
    )
    .all();

  const decisionByAppointmentId = {};
  for (const r of decisionRows) {
    const msg = String(r.message || '');
    const parts = msg.split('|');
    const appointmentId = String(parts[1] || '').trim();
    const status = String(parts[2] || '').trim().toLowerCase();
    if (!appointmentId) continue;
    if (decisionByAppointmentId[appointmentId]) continue;
    if (status !== 'accepted' && status !== 'rejected') continue;
    decisionByAppointmentId[appointmentId] = { status, decidedAt: r.created_at };
  }

  const appointments = [];
  for (const r of rows) {
    const parsed = parseAppointmentMessage(r.message);
    if (!parsed) continue;
    const decision = decisionByAppointmentId[r.id];
    appointments.push({
      id: r.id,
      userId: r.user_id,
      phoneOrEmail: r.phone_or_email || parsed.login || '',
      name: parsed.name || '',
      amount: parsed.amount || '',
      date: parsed.date || '',
      time: parsed.time || '',
      location: parsed.location || '',
      note: parsed.note || '',
      createdAt: r.created_at,
      status: decision?.status || 'pending',
      decidedAt: decision?.decidedAt || null,
    });
  }
  res.json({ appointments });
});

app.post('/api/admin/appointments/:appointmentId/decision', requireAdmin, (req, res) => {
  const { appointmentId } = req.params;
  const status = String(req.body?.status || '').trim().toLowerCase();
  const note = String(req.body?.note || '').trim();
  if (status !== 'accepted' && status !== 'rejected') {
    res.status(400).json({ message: 'Invalid status.' });
    return;
  }
  const row = db
    .prepare('SELECT id, user_id, message, created_at FROM chat_messages WHERE id = ? AND upper(message) LIKE \'APPOINTMENT REQUEST%\'')
    .get(appointmentId);
  if (!row) {
    res.status(404).json({ message: 'Appointment not found.' });
    return;
  }
  const parsed = parseAppointmentMessage(row.message) || {};
  const userId = row.user_id;
  const friendly = status === 'accepted' ? 'Appointment accepted.' : 'Appointment rejected.';
  const decisionMessage = [
    `APPOINTMENT_DECISION|${appointmentId}|${status}`,
    friendly,
    parsed.amount ? `Deposit Amount: ${parsed.amount}` : null,
    parsed.date ? `Date: ${parsed.date}` : null,
    parsed.time ? `Time: ${parsed.time}` : null,
    parsed.location ? `Location/Branch: ${parsed.location}` : null,
    note ? `Note: ${note}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const id = makeId('MSG');
  db.prepare('INSERT INTO chat_messages (id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    userId,
    'admin',
    decisionMessage,
    now(),
  );
  res.json({ ok: true });
});

app.get('/api/admin/chat/realtime/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let lastSent = 0;
  const send = () => {
    const rows = db
      .prepare('SELECT id, user_id, sender, message, created_at FROM chat_messages WHERE user_id = ? AND created_at > ? ORDER BY created_at ASC')
      .all(userId, lastSent);
    if (!rows.length) return;
    lastSent = rows[rows.length - 1]?.created_at || lastSent;
    res.write(`data: ${JSON.stringify({
      messages: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        sender: r.sender,
        message: r.message,
        createdAt: r.created_at,
      })),
    })}\n\n`);
  };

  const interval = setInterval(send, 1000);
  send();
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.post('/api/admin/applications/:appId/approve', requireAdmin, (req, res) => {
  const { appId } = req.params;
  const { withdrawCode = '' } = req.body || {};
  const row = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(appId);
  if (!row) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }
  const appPayload = JSON.parse(row.payload_json);
  const updated = {
    ...appPayload,
    status: 'approved',
    approvedAt: now(),
    withdrawCode: String(withdrawCode || appPayload.withdrawCode || '').trim(),
  };
  db.prepare('UPDATE applications SET status = ?, approved_at = ?, withdraw_code = ?, payload_json = ? WHERE id = ?').run(
    'approved',
    updated.approvedAt,
    updated.withdrawCode || null,
    JSON.stringify(updated),
    appId,
  );
  const bal = db.prepare('SELECT current_balance, withdrawn_amount FROM balances WHERE user_id = ?').get(updated.userId);
  if (!bal || Number(bal.current_balance) <= 0) {
    db.prepare(
      `INSERT INTO balances (user_id, current_balance, withdrawn_amount)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET current_balance = excluded.current_balance`,
    ).run(updated.userId, Number(updated.loan?.amount || 0), Number(bal?.withdrawn_amount || 0));
  }
  res.json({ application: updated });
});

app.post('/api/admin/applications/:appId/reject', requireAdmin, (req, res) => {
  const { appId } = req.params;
  const row = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(appId);
  if (!row) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }
  const appPayload = JSON.parse(row.payload_json);
  const updated = { ...appPayload, status: 'rejected' };
  db.prepare('UPDATE applications SET status = ?, payload_json = ? WHERE id = ?').run('rejected', JSON.stringify(updated), appId);
  res.json({ application: updated });
});

app.post('/api/admin/applications/:appId/code', requireAdmin, (req, res) => {
  const { appId } = req.params;
  const { withdrawCode = '' } = req.body || {};
  const row = db.prepare('SELECT payload_json FROM applications WHERE id = ?').get(appId);
  if (!row) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }
  const appPayload = JSON.parse(row.payload_json);
  const updated = { ...appPayload, withdrawCode: String(withdrawCode || '').trim() };
  db.prepare('UPDATE applications SET withdraw_code = ?, payload_json = ? WHERE id = ?').run(updated.withdrawCode, JSON.stringify(updated), appId);
  res.json({ application: updated });
});

app.use((req, res) => {
  if (String(req.path || '').startsWith('/api/')) {
    res.status(404).json({ message: 'Not found.' });
    return;
  }
  res.status(404).send('Website not working');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running at http://localhost:${PORT}`);
});
