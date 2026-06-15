import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const envPath = path.resolve(apiRoot, '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;

      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!match) return env;

      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      return env;
    }, {});
}

const fileEnv = parseEnvFile(envPath);

function readEnv(key, fallback = '') {
  return process.env[key] || fileEnv[key] || fallback;
}

function readBool(key, fallback = false) {
  const value = readEnv(key, fallback ? 'true' : 'false').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function resolveApiPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
}

export const config = {
  appName: 'soulmate-api',
  appVersion: '0.4.4',
  apiRoot,
  host: readEnv('HOST', '127.0.0.1'),
  port: Number(readEnv('PORT', '3001')),
  deepseek: {
    url: readEnv('DEEPSEEK_URL', 'https://api.deepseek.com').replace(/\/+$/, ''),
    apiKey: readEnv('DEEPSEEK_API_KEY', ''),
    model: readEnv('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
    timeoutMs: Number(readEnv('DEEPSEEK_TIMEOUT_MS', '18000'))
  },
  db: {
    path: resolveApiPath(readEnv('DB_PATH', './data/soulmate.sqlite'))
  },
  memory: {
    enabled: readBool('MEMORY_ENABLED', true),
    adminToken: readEnv('ADMIN_TOKEN', '')
  }
};

export function assertDeepSeekReady() {
  if (!config.deepseek.apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY. Set it in api/.env or process env.');
  }
}
