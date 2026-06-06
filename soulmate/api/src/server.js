import http from 'node:http';
import { config } from './config.js';
import { getDatabaseHealth, initDatabase } from './db.js';
import { streamDeepSeek } from './deepseek.js';
import { fallbackReply } from './fallback.js';
import { buildChatMessages, getRequestDate } from './prompt.js';
import { readJsonBody, sendJson, sendSseHeaders, writeSse } from './http.js';
import { createMemory, listMemories, moveUidData, resetUidData, sanitizeUid, saveChatMessage, updateMemory } from './memoryStore.js';
import { emptyMemoryContext, markMemoryContextUsed, retrieveMemoryContext } from './memoryRetrieve.js';

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
  try {
    sanitizeUid(payload.uid);
  } catch (error) {
    return error.message;
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

  payload.uid = sanitizeUid(payload.uid);
  payload.sessionId = payload.sessionId || payload.uid;
  const memoryContext = getSafeMemoryContext(payload);
  saveChatMessageSafe({
    uid: payload.uid,
    role: 'user',
    text: payload.message,
    mood: payload.mood,
    heartScore: payload.heartScore,
    intimacy: payload.intimacy,
    source: 'user',
    clientTime: payload.clientTime,
    sessionId: payload.sessionId
  });

  sendSseHeaders(res);
  let source = 'deepseek';
  try {
    writeSse(res, 'meta', {
      ok: true,
      source,
      uid: payload.uid
    });

    const messages = buildChatMessages(payload, memoryContext);
    const reply = await streamDeepSeek(messages, (delta, fullText) => {
      writeSse(res, 'delta', {
        delta,
        fullText
      });
    });

    markMemoryContextUsedSafe(memoryContext);
    saveChatMessageSafe({
      uid: payload.uid,
      role: 'assistant',
      text: reply,
      mood: payload.mood,
      heartScore: payload.heartScore,
      intimacy: payload.intimacy,
      source,
      clientTime: payload.clientTime,
      sessionId: payload.sessionId
    });

    writeSse(res, 'done', {
      ok: true,
      reply,
      mood: ['happy', 'angry', 'cute'].includes(payload.mood) ? payload.mood : 'cute',
      heartDelta: 2,
      memoryUsed: serializeMemoryContext(memoryContext),
      source,
      time: getRequestDate(payload.clientTime).toISOString()
    });
  } catch (error) {
    source = 'fallback';
    console.warn('SoulMate chat fallback:', error.message);
    const reply = fallbackReply(payload);
    saveChatMessageSafe({
      uid: payload.uid,
      role: 'assistant',
      text: reply,
      mood: payload.mood,
      heartScore: payload.heartScore,
      intimacy: payload.intimacy,
      source,
      clientTime: payload.clientTime,
      sessionId: payload.sessionId
    });
    writeSse(res, 'done', {
      ok: true,
      reply,
      mood: ['happy', 'angry', 'cute'].includes(payload.mood) ? payload.mood : 'cute',
      heartDelta: 1,
      memoryUsed: serializeMemoryContext(memoryContext),
      source,
      time: getRequestDate(payload.clientTime).toISOString()
    });
  } finally {
    res.end();
  }
}

async function handleMemory(req, res, url, pathname) {
  if (!requireAdmin(req, res)) return;

  const idMatch = pathname.match(/^\/(?:api\/)?memory\/(\d+)$/);

  try {
    if ((pathname === '/memory' || pathname === '/api/memory') && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        memories: listMemories({
          uid: url.searchParams.get('uid') || '',
          includeGlobal: ['1', 'true', 'yes'].includes((url.searchParams.get('includeGlobal') || '').toLowerCase()),
          q: url.searchParams.get('q') || '',
          level: url.searchParams.get('level') || '',
          type: url.searchParams.get('type') || '',
          status: url.searchParams.get('status') || '',
          limit: url.searchParams.get('limit') || ''
        })
      });
      return;
    }

    if ((pathname === '/memory' || pathname === '/api/memory') && req.method === 'POST') {
      const payload = await readJsonBody(req);
      sendJson(res, 201, {
        ok: true,
        memory: createMemory(payload)
      });
      return;
    }

    if (idMatch && req.method === 'PATCH') {
      const payload = await readJsonBody(req);
      const memory = updateMemory(Number(idMatch[1]), payload);
      if (!memory) {
        sendJson(res, 404, { ok: false, error: 'Memory not found' });
        return;
      }
      sendJson(res, 200, { ok: true, memory });
      return;
    }

    methodNotAllowed(res);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message
    });
  }
}

function handleContextPreview(req, res, url) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  const payload = {
    uid: url.searchParams.get('uid') || 'preview',
    message: url.searchParams.get('message') || url.searchParams.get('q') || '',
    mood: url.searchParams.get('mood') || '',
    heartScore: Number(url.searchParams.get('heartScore')) || 0,
    intimacy: url.searchParams.get('intimacy') || '',
    clientTime: url.searchParams.get('clientTime') || new Date().toISOString(),
    sessionId: url.searchParams.get('sessionId') || 'default',
    recentMessages: []
  };
  const context = getSafeMemoryContext(payload);

  sendJson(res, 200, {
    ok: true,
    context: {
      corrections: context.corrections,
      memories: context.memories,
      summaries: context.summaries,
      keywords: context.keywords
    }
  });
}

async function handleUidMove(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const result = moveUidData(payload);
    sendJson(res, 200, {
      ok: true,
      ...result
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      ok: false,
      error: error.message,
      details: error.details || undefined
    });
  }
}

async function handleUidReset(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const result = resetUidData(payload);
    sendJson(res, 200, {
      ok: true,
      ...result
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      ok: false,
      error: error.message
    });
  }
}

async function routeRequest(req, res) {
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

  if (pathname === '/uid/move' || pathname === '/api/uid/move') {
    await handleUidMove(req, res);
    return;
  }

  if (pathname === '/uid/reset' || pathname === '/api/uid/reset') {
    await handleUidReset(req, res);
    return;
  }

  if (isMemoryPath(pathname)) {
    await handleMemory(req, res, url, pathname);
    return;
  }

  if (pathname === '/context/preview' || pathname === '/api/context/preview') {
    handleContextPreview(req, res, url);
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
    const db = getDatabaseHealth();
    sendJson(res, 200, {
      ok: true,
      service: config.appName,
      version: config.appVersion,
      db: db.status,
      dbMigrations: db.migrations || 0,
      memoryEnabled: config.memory.enabled,
      adminConfigured: Boolean(config.memory.adminToken),
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
}

const server = http.createServer((req, res) => {
  routeRequest(req, res).catch((error) => {
    console.error('SoulMate request error:', error);
    sendJson(res, 500, {
      ok: false,
      error: 'Internal Server Error'
    });
  });
});

const dbStatus = initDatabase();
if (!dbStatus.ok) {
  console.warn('SoulMate database unavailable:', dbStatus.error);
}

server.listen(config.port, config.host, () => {
  console.log(`${config.appName} v${config.appVersion} listening on http://${config.host}:${config.port}`);
});

function isMemoryPath(pathname) {
  return pathname === '/memory' ||
    pathname === '/api/memory' ||
    /^\/(?:api\/)?memory\/\d+$/.test(pathname);
}

function requireAdmin(req, res) {
  if (!config.memory.adminToken) {
    sendJson(res, 503, {
      ok: false,
      error: 'ADMIN_TOKEN is not configured'
    });
    return false;
  }

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const token = req.headers['x-admin-token'] || bearer;

  if (token !== config.memory.adminToken) {
    sendJson(res, 401, {
      ok: false,
      error: 'Unauthorized'
    });
    return false;
  }

  return true;
}

function getSafeMemoryContext(payload) {
  try {
    return retrieveMemoryContext(payload);
  } catch (error) {
    console.warn('SoulMate memory retrieval skipped:', error.message);
    return emptyMemoryContext();
  }
}

function markMemoryContextUsedSafe(context) {
  try {
    markMemoryContextUsed(context);
  } catch (error) {
    console.warn('SoulMate memory usage update skipped:', error.message);
  }
}

function saveChatMessageSafe(input) {
  try {
    saveChatMessage(input);
  } catch (error) {
    console.warn('SoulMate chat log skipped:', error.message);
  }
}

function serializeMemoryContext(context) {
  return [
    ...(context.memories || []),
    ...(context.summaries || [])
  ].map((memory) => ({
    id: memory.id,
    uid: memory.uid || null,
    level: memory.level,
    type: memory.type,
    text: memory.text
  }));
}
