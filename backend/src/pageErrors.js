import fs from 'node:fs';
import path from 'node:path';

const resolveFilePath = () => {
  const raw = String(process.env.PAGE_ERRORS_FILE || './data/page_errors.json').trim();
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
};

export const readPageErrors = () => {
  const filePath = resolveFilePath();
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
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
  } catch {
    return {};
  }
};

export const writePageErrors = (pageErrors) => {
  const filePath = resolveFilePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const next = {};
  const entries = Object.entries(pageErrors && typeof pageErrors === 'object' ? pageErrors : {}).slice(0, 200);
  for (const [k, v] of entries) {
    const key = String(k || '').trim();
    if (!key) continue;
    const enabled = !!(v && typeof v === 'object' && 'enabled' in v ? v.enabled : true);
    const message = String(v && typeof v === 'object' && 'message' in v ? v.message : '').trim().slice(0, 1500);
    next[key] = { enabled, message };
  }
  const payload = JSON.stringify(next, null, 2);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, filePath);
  return next;
};

