import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const defaultFile = () => {
  const cwd = process.cwd();
  return path.join(cwd, 'data', 'agent_permissions.json');
};

const getFilePath = () => {
  const v = String(process.env.AGENT_PERMISSIONS_FILE || '').trim();
  return v || defaultFile();
};

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

export const readAgentPermissions = () => {
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

export const readAgentPermissionFor = (agentId) => {
  const config = readAgentPermissions();
  const v = config?.[String(agentId || '').trim()];
  if (!v || typeof v !== 'object') return null;
  return v;
};

export const writeAgentPermissionFor = (agentId, permission) => {
  const id = String(agentId || '').trim();
  if (!id) return;
  const filePath = getFilePath();
  const config = readAgentPermissions();
  config[id] = permission && typeof permission === 'object' ? permission : {};
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
};
