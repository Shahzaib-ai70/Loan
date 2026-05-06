import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const defaultFile = () => {
  const cwd = process.cwd();
  return path.join(cwd, 'data', 'chat_assignments.json');
};

const getFilePath = () => {
  const v = String(process.env.CHAT_ASSIGNMENTS_FILE || '').trim();
  return v || defaultFile();
};

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

export const readChatAssignments = () => {
  const filePath = getFilePath();
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

export const readChatAssigneeForUser = (userId) => {
  const id = String(userId || '').trim();
  if (!id) return '';
  const config = readChatAssignments();
  const v = config?.[id];
  return String(v || '').trim();
};

export const writeChatAssigneeForUser = (userId, agentId) => {
  const id = String(userId || '').trim();
  if (!id) return;
  const a = String(agentId || '').trim();
  const filePath = getFilePath();
  const config = readChatAssignments();
  if (a) config[id] = a;
  else if (Object.prototype.hasOwnProperty.call(config, id)) delete config[id];
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
};

