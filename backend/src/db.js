import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const dbFile = process.env.DB_FILE || './data/loan_app.db';
const absoluteDbFile = path.isAbsolute(dbFile) ? dbFile : path.resolve(process.cwd(), dbFile);

fs.mkdirSync(path.dirname(absoluteDbFile), { recursive: true });

export const db = new Database(absoluteDbFile);
db.pragma('journal_mode = WAL');

export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      gender TEXT NOT NULL,
      phone_or_email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      invite_code TEXT,
      created_at INTEGER NOT NULL,
      last_application_id TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      approved_at INTEGER,
      withdraw_code TEXT,
      payload_json TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS balances (
      user_id TEXT PRIMARY KEY,
      current_balance REAL NOT NULL DEFAULT 0,
      withdrawn_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      whatsapp_link TEXT NOT NULL,
      telegram_link TEXT NOT NULL,
      support_email TEXT NOT NULL,
      helpline TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_time ON chat_messages(user_id, created_at);
  `);

  const pin = process.env.DEFAULT_ADMIN_PIN || '123456';
  db.prepare('INSERT OR IGNORE INTO admin_settings (id, pin) VALUES (1, ?)').run(pin);

  const cols = db.prepare('PRAGMA table_info(admin_settings)').all();
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('username')) db.exec('ALTER TABLE admin_settings ADD COLUMN username TEXT');
  if (!colNames.has('password_salt')) db.exec('ALTER TABLE admin_settings ADD COLUMN password_salt TEXT');
  if (!colNames.has('password_hash')) db.exec('ALTER TABLE admin_settings ADD COLUMN password_hash TEXT');

  const userCols = db.prepare('PRAGMA table_info(users)').all();
  const userColNames = new Set(userCols.map((c) => c.name));
  if (!userColNames.has('agent_id')) db.exec('ALTER TABLE users ADD COLUMN agent_id TEXT');

  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || pin;
  const row = db.prepare('SELECT username, password_salt, password_hash FROM admin_settings WHERE id = 1').get();
  if (!row?.username || !row?.password_salt || !row?.password_hash) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    db.prepare('UPDATE admin_settings SET username = ?, password_salt = ?, password_hash = ? WHERE id = 1').run(
      String(username).trim(),
      salt,
      hash,
    );
  }

  db.prepare(
    'INSERT OR IGNORE INTO support_settings (id, whatsapp_link, telegram_link, support_email, helpline) VALUES (1, ?, ?, ?, ?)',
  ).run('https://wa.me/17733229624', 'https://t.me/vbloanbank_support', 'support@vbloanbank.com', '+1 773 322 9624');
};

export const now = () => Date.now();
