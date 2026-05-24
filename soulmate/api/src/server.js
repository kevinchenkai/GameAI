import http from 'node:http';
import { config } from './config.js';
import { streamDeepSeek } from './deepseek.js';
import { fallbackReply } from './fallback.js';
import { buildChatMessages, getRequestDate } from './prompt.js';
import { readJsonBody, sendJson, sendSseHeaders, writeSse } from './http.js';

function notFound(res, pathname) {
  sendJson(res, 404, {
    ok: false,
    error: 'Not Found',
    path: pathname
  });
}

function methodNotAllowed(res) {
  sendJson(res, 405, {
    ok: false,
    error: 'Method Not Allowed'
  });
}

function validateChatPayload(payload) {
  if (!payload || typeof payload.message !== 'string' || !payload.message.trim()) {
    return 'message is required';
  }
  return '';
}

async function handleChat(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message || 'invalid request body'
    });
    return;
  }

  const validationError = validateChatPayload(payload);
  if (validationError) {
    sendJson(res, 400, {
      ok: false,
      error: validationError
    });
    return;
  }

  sendSseHeaders(res);

  let source = 'deepseek';
  try {
    writeSse(res, 'meta', {
      ok: true,
      source
    });

    const messages = buildChatMessages(payload);
    const reply = await streamDeepSeek(messages, (delta, fullText) => {
      writeSse(res, 'delta', {
        delta,
        fullText
      });
    });

    writeSse(res, 'done', {
      ok: true,
      reply,
      mood: ['happy', 'angry', 'cute'].includes(payload.mood) ? payload.mood : 'cute',
      heartDelta: 2,
      source,
      time: getRequestDate(payload.clientTime).toISOString()
    });
  } catch (error) {
    source = 'fallback';
    console.warn('SoulMate chat fallback:', error.message);
    writeSse(res, 'done', {
      ok: true,
      reply: fallbackReply(payload),
      mood: ['happy', 'angry', 'cute'].includes(payload.mood) ? payload.mood : 'cute',
      heartDelta: 1,
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

  if (req.method === 'POST' && (pathname === '/chat' || pathname === '/api/chat')) {
    handleChat(req, res);
    return;
  }

  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  if (pathname === '/' || pathname === '/api') {
    sendJson(res, 200, {
      ok: true,
      service: config.appName,
      version: config.appVersion,
      message: 'SoulMate API is running.'
    });
    return;
  }

  if (pathname === '/health' || pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: config.appName,
      version: config.appVersion,
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString()
    });
    return;
  }

  if (pathname === '/hello' || pathname === '/api/hello') {
    sendJson(res, 200, {
      ok: true,
      message: 'Hello, world!',
      from: 'SoulMate Node.js API',
      time: new Date().toISOString()
    });
    return;
  }

  notFound(res, pathname);
});

server.listen(config.port, config.host, () => {
  console.log(`${config.appName} v${config.appVersion} listening on http://${config.host}:${config.port}`);
});
