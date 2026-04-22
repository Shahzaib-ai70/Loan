import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const dbFile = process.env.DB_FILE || './data/loan_app.db';
const absoluteDbFile = path.isAbsolute(dbFile) ? dbFile : path.resolve(process.cwd(), dbFile);

const username = String(process.env.DEFAULT_ADMIN_USERNAME || '').trim();
const password = String(process.env.DEFAULT_ADMIN_PASSWORD || '');

if (!username || !password) {
  // eslint-disable-next-line no-console
  console.error('DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD are required.');
  process.exit(1);
}

const db = new Database(absoluteDbFile);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pin TEXT NOT NULL
  );
`);
db.prepare('INSERT OR IGNORE INTO admin_settings (id, pin) VALUES (1, ?)').run(process.env.DEFAULT_ADMIN_PIN || '123456');

const cols = db.prepare('PRAGMA table_info(admin_settings)').all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has('username')) db.exec('ALTER TABLE admin_settings ADD COLUMN username TEXT');
if (!colNames.has('password_salt')) db.exec('ALTER TABLE admin_settings ADD COLUMN password_salt TEXT');
if (!colNames.has('password_hash')) db.exec('ALTER TABLE admin_settings ADD COLUMN password_hash TEXT');

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');

db.prepare('UPDATE admin_settings SET username = ?, password_salt = ?, password_hash = ? WHERE id = 1').run(
  username,
  salt,
  hash,
);

// eslint-disable-next-line no-console
console.log(`Admin credentials updated for user "${username}".`);

