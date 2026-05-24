import http from 'node:http';
import { config } from './config.js';
import { streamDeepSeek } from './deepseek.js';
import { fallbackReply } from './fallback.js';
import { readJsonBody, sendJson, sendSseHeaders, writeSse } from './http.js';
import { NPC_PROFILES } from './npcs.js';
import { buildChatMessages, getRequestDate } from './prompt.js';

function validateChatPayload(payload) {
  if (!payload || typeof payload.message !== 'string' || !payload.message.trim()) return 'message is required';
  if (payload.message.length > 300) return 'message is too long';
  if (!payload.npcId || !NPC_PROFILES[payload.npcId]) return 'npcId is invalid';
  return '';
}

async function handleChat(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'invalid request body' });
    return;
  }

  const validationError = validateChatPayload(payload);
  if (validationError) {
    sendJson(res, 400, { ok: false, error: validationError });
    return;
  }

  sendSseHeaders(res);
  let source = 'deepseek';
  try {
    writeSse(res, 'meta', { ok: true, source });
    const messages = buildChatMessages(payload);
    const reply = await streamDeepSeek(messages, (delta, fullText) => {
      writeSse(res, 'delta', { delta, fullText });
    });
    writeSse(res, 'done', {
      ok: true,
      reply,
      source,
      time: getRequestDate(payload.clientTime).toISOString()
    });
  } catch (error) {
    source = 'fallback';
    console.warn('Wulin Tavern chat fallback:', error.message);
    writeSse(res, 'done', {
      ok: true,
      reply: fallbackReply(payload),
      source,
      time: getRequestDate(payload.clientTime).toISOString()
    });
  } finally {
    res.end();
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${config.host}:${config.port}`}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'POST' && (pathname === '/api/chat' || pathname === '/chat')) {
    void handleChat(req, res);
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  if (pathname === '/' || pathname === '/api') {
    sendJson(res, 200, {
      ok: true,
      service: config.appName,
      version: config.appVersion,
      message: '武林小馆 API 正在营业。'
    });
    return;
  }

  if (pathname === '/api/health' || pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: config.appName,
      version: config.appVersion,
      model: config.deepseek.model,
      hasDeepSeekKey: Boolean(config.deepseek.apiKey),
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString()
    });
    return;
  }

  if (pathname === '/api/hello' || pathname === '/hello') {
    sendJson(res, 200, {
      ok: true,
      message: '小虾米，欢迎来到武林小馆。',
      time: new Date().toISOString()
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found', path: pathname });
});

server.listen(config.port, config.host, () => {
  console.log(`${config.appName} v${config.appVersion} listening on http://${config.host}:${config.port}`);
});
