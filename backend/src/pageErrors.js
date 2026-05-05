import fs from 'node:fs';
import path from 'node:path';

const resolveFilePath = () => {
  const raw = String(process.env.PAGE_ERRORS_FILE || './data/page_errors.json').trim();
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
};

const normalizePageErrors = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || '').trim();
    if (!key) continue;
    const enabled = !!(v && typeof v === 'object' && 'enabled' in v ? v.enabled : true);
    const message = String(v && typeof v === 'object' && 'message' in v ? v.message : '').trim();
    if (!message) {
      out[key] = { enabled: false, message: '' };
      continue;
    }
    out[key] = { enabled, message: message.slice(0, 1500) };
  }
  return out;
};

const normalizePageErrorsConfig = (raw) => {
  const base = raw && typeof raw === 'object' ? raw : {};
  const hasGlobal = base && typeof base === 'object' && 'global' in base;
  const hasPerUser = base && typeof base === 'object' && 'perUser' in base;
  if (!hasGlobal && !hasPerUser) {
    return { global: normalizePageErrors(base), perUser: {} };
  }
  const global = normalizePageErrors(base.global);
  const perUser = {};
  const perRaw = base.perUser && typeof base.perUser === 'object' ? base.perUser : {};
  for (const [userIdRaw, cfgRaw] of Object.entries(perRaw)) {
    const userId = String(userIdRaw || '').trim();
    if (!userId) continue;
    const normalized = normalizePageErrors(cfgRaw);
    if (!Object.keys(normalized).length) continue;
    perUser[userId] = normalized;
  }
  return { global, perUser };
};

export const readPageErrorsConfig = () => {
  const filePath = resolveFilePath();
  try {
    if (!fs.existsSync(filePath)) return { global: {}, perUser: {} };
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizePageErrorsConfig(parsed);
  } catch {
    return { global: {}, perUser: {} };
  }
};

export const writePageErrorsConfig = (config) => {
  const filePath = resolveFilePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const next = normalizePageErrorsConfig(config);
  const payload = JSON.stringify(next, null, 2);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, filePath);
  return next;
};

export const readPageErrorsForUser = (userId) => {
  const cfg = readPageErrorsConfig();
  const out = { ...cfg.global };
  const id = String(userId || '').trim();
  if (!id) return out;
  const override = cfg.perUser && typeof cfg.perUser === 'object' ? cfg.perUser[id] : null;
  if (!override || typeof override !== 'object') return out;
  for (const [k, v] of Object.entries(override)) out[k] = v;
  return out;
};

export const readPageErrors = () => readPageErrorsForUser('');

export const writePageErrors = (pageErrors) => {
  const next = writePageErrorsConfig(pageErrors);
  return next.global;
};

