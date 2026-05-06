import fs from 'node:fs';
import path from 'node:path';

const resolveFilePath = () => {
  const raw = String(process.env.CREDIT_SCORES_FILE || './data/credit_scores.json').trim();
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
};

const clampScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < 0) return 0;
  if (v > 1000) return 1000;
  return v;
};

export const readCreditScore = (userId) => {
  const id = String(userId || '').trim();
  if (!id) return null;
  const filePath = resolveFilePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const v = parsed[id];
    const score = clampScore(v);
    return score;
  } catch {
    return null;
  }
};

export const writeCreditScore = (userId, value) => {
  const id = String(userId || '').trim();
  if (!id) return null;
  const score = clampScore(value);
  if (score === null) return null;
  const filePath = resolveFilePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  let parsed = {};
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') parsed = p;
    }
  } catch {
    parsed = {};
  }
  parsed[id] = score;
  const payload = JSON.stringify(parsed, null, 2);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, filePath);
  return score;
};
