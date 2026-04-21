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
  const agent = db.prepare('SELECT id FROM agents WHERE invite_code = ?').get(inv);
  if (!agent) {
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
  ).run(id, gender, String(phoneOrEmail).trim(), String(password), inv, now(), agent.id);
  db.prepare('INSERT OR IGNORE INTO balances (user_id, current_balance, withdrawn_amount) VALUES (?, 0, 0)').run(id);

  res.json({
    user: { id, gender, phoneOrEmail: String(phoneOrEmail).trim(), createdAt: now(), agentId: agent.id },
    session: { isLoggedIn: true, userId: id, lastLoginAt: now() },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { loginId = '', password = '' } = req.body || {};
  const user = db
    .prepare('SELECT id, gender, phone_or_email, password, created_at, last_application_id, agent_id FROM users WHERE lower(phone_or_email) = ?')
    .get(normalize(loginId));
  if (!user || user.password !== String(password)) {
    res.status(401).json({ message: 'Invalid login details.' });
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
  if (String(code).trim() !== String(appPayload.withdrawCode || '').trim()) {
    res.status(400).json({ message: 'Invalid withdraw code.' });
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
  res.json({ message: 'Withdraw successful', amount: current });
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
    .prepare('SELECT id, gender, phone_or_email, created_at, last_application_id, agent_id FROM users ORDER BY created_at DESC')
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
    .prepare('SELECT id, gender, phone_or_email, created_at, last_application_id, agent_id FROM users WHERE agent_id = ? ORDER BY created_at DESC')
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
    })),
    applications,
    balances,
  });
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running at http://localhost:${PORT}`);
});
