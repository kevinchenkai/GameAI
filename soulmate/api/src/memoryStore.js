import { getDatabase } from './db.js';

const LEVELS = new Set(['L1', 'L2', 'L3', 'L4', 'L5']);
const STATUSES = new Set(['active', 'pending', 'archived', 'rejected']);
const MEMORY_TYPES = new Set(['fact', 'preference', 'habit', 'event', 'emotion', 'style', 'summary', 'relationship', 'other']);
const UID_PATTERN = /^[a-z][a-z0-9_-]{2,31}$/;

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

export function sanitizeSessionId(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 80) : 'default';
}

export function sanitizeUid(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!UID_PATTERN.test(text)) {
    throw new Error('uid must be 3-32 chars, start with a letter, and contain only lowercase letters, numbers, underscores, or hyphens');
  }
  return text;
}

export function normalizeOptionalUid(value) {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return null;
  return sanitizeUid(value);
}

export function saveChatMessage(input) {
  const text = String(input?.text || '').trim();
  if (!text) return null;

  const role = ['user', 'assistant', 'system'].includes(input.role) ? input.role : 'system';
  const uid = sanitizeUid(input.uid);
  const sessionId = sanitizeSessionId(input.sessionId || uid);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO chat_messages (
        uid, session_id, role, text, mood, heart_score, intimacy, source, client_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      uid,
      sessionId,
      role,
      text.slice(0, 4000),
      input.mood || null,
      Number.isFinite(Number(input.heartScore)) ? Number(input.heartScore) : null,
      input.intimacy || null,
      input.source || null,
      input.clientTime || null,
      new Date().toISOString()
    );

  return Number(result.lastInsertRowid);
}

export function listMemories(filters = {}) {
  const db = getDatabase();
  const where = [];
  const params = [];

  if (filters.level && LEVELS.has(filters.level)) {
    where.push('level = ?');
    params.push(filters.level);
  }

  if (filters.type && MEMORY_TYPES.has(filters.type)) {
    where.push('type = ?');
    params.push(filters.type);
  }

  if (filters.status && STATUSES.has(filters.status)) {
    where.push('status = ?');
    params.push(filters.status);
  }

  const uidFilter = normalizeMemoryUidFilter(filters.uid);
  if (uidFilter.mode === 'global') {
    where.push('uid IS NULL');
  } else if (uidFilter.mode === 'uid') {
    if (filters.includeGlobal) {
      where.push('(uid = ? OR uid IS NULL)');
    } else {
      where.push('uid = ?');
    }
    params.push(uidFilter.uid);
  }

  if (filters.q) {
    where.push('(text LIKE ? OR tags_json LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }

  const limit = clampInteger(filters.limit, 1, 500, 100);
  const sql = `
    SELECT *
    FROM memories
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
      CASE WHEN uid IS NULL THEN 0 ELSE 1 END,
      pinned DESC,
      importance DESC,
      updated_at DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(...params, limit).map(rowToMemory);
}

export function listRetrievableMemoriesForUid(uid, limit = 200) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const normalizedUid = sanitizeUid(uid);
  return db
    .prepare(`
      SELECT *
      FROM memories
      WHERE status = 'active'
        AND (uid IS NULL OR uid = ?)
        AND (expires_at IS NULL OR expires_at = '' OR expires_at > ?)
      ORDER BY pinned DESC, importance DESC, updated_at DESC
      LIMIT ?
    `)
    .all(normalizedUid, now, clampInteger(limit, 1, 1000, 200))
    .map(rowToMemory);
}

export function getMemory(id) {
  const row = getDatabase().prepare('SELECT * FROM memories WHERE id = ?').get(Number(id));
  return row ? rowToMemory(row) : null;
}

export function createMemory(input) {
  const text = String(input?.text || '').trim();
  if (!text) {
    throw new Error('memory text is required');
  }

  const now = new Date().toISOString();
  const level = LEVELS.has(input.level) ? input.level : 'L2';
  const type = MEMORY_TYPES.has(input.type) ? input.type : 'preference';
  const status = STATUSES.has(input.status) ? input.status : level === 'L5' ? 'pending' : 'active';
  const tags = normalizeTags(input.tags);
  const sourceIds = Array.isArray(input.sourceMessageIds) ? input.sourceMessageIds : [];
  const uid = normalizeOptionalUid(input.uid);

  const result = getDatabase()
    .prepare(`
      INSERT INTO memories (
        uid, level, type, text, normalized_text, tags_json, source, source_message_ids_json,
        confidence, importance, durability, status, pinned, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      uid,
      level,
      type,
      text.slice(0, 1200),
      normalizeText(text),
      JSON.stringify(tags),
      String(input.source || 'manual').slice(0, 40),
      JSON.stringify(sourceIds),
      clampNumber(input.confidence, 0, 1, 1),
      clampInteger(input.importance, 1, 10, 5),
      clampInteger(input.durability, 1, 10, 5),
      status,
      input.pinned ? 1 : 0,
      input.expiresAt || input.expires_at || null,
      now,
      now
    );

  return getMemory(Number(result.lastInsertRowid));
}

export function updateMemory(id, input) {
  const existing = getMemory(id);
  if (!existing) return null;

  const fields = [];
  const params = [];

  function setField(column, value) {
    fields.push(`${column} = ?`);
    params.push(value);
  }

  if (input.level && LEVELS.has(input.level)) setField('level', input.level);
  if (input.type && MEMORY_TYPES.has(input.type)) setField('type', input.type);
  if (Object.prototype.hasOwnProperty.call(input, 'uid')) setField('uid', normalizeOptionalUid(input.uid));
  if (typeof input.text === 'string' && input.text.trim()) {
    const text = input.text.trim().slice(0, 1200);
    setField('text', text);
    setField('normalized_text', normalizeText(text));
  }
  if (Object.prototype.hasOwnProperty.call(input, 'tags')) {
    setField('tags_json', JSON.stringify(normalizeTags(input.tags)));
  }
  if (Object.prototype.hasOwnProperty.call(input, 'confidence')) {
    setField('confidence', clampNumber(input.confidence, 0, 1, existing.confidence));
  }
  if (Object.prototype.hasOwnProperty.call(input, 'importance')) {
    setField('importance', clampInteger(input.importance, 1, 10, existing.importance));
  }
  if (Object.prototype.hasOwnProperty.call(input, 'durability')) {
    setField('durability', clampInteger(input.durability, 1, 10, existing.durability));
  }
  if (input.status && STATUSES.has(input.status)) setField('status', input.status);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) setField('pinned', input.pinned ? 1 : 0);
  if (Object.prototype.hasOwnProperty.call(input, 'expiresAt')) setField('expires_at', input.expiresAt || null);
  if (Object.prototype.hasOwnProperty.call(input, 'expires_at')) setField('expires_at', input.expires_at || null);

  if (!fields.length) return existing;

  setField('updated_at', new Date().toISOString());
  getDatabase()
    .prepare(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params, Number(id));

  return getMemory(id);
}

export function markMemoriesUsed(ids) {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!uniqueIds.length) return;

  const db = getDatabase();
  const statement = db.prepare(`
    UPDATE memories
    SET use_count = use_count + 1,
        last_used_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {
    for (const id of uniqueIds) {
      statement.run(now, now, id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function listEnabledCorrections(uid, limit = 5) {
  const normalizedUid = sanitizeUid(uid);
  return getDatabase()
    .prepare(`
      SELECT *
      FROM corrections
      WHERE enabled = 1
        AND (uid IS NULL OR uid = ?)
      ORDER BY updated_at DESC
      LIMIT ?
    `)
    .all(normalizedUid, clampInteger(limit, 1, 20, 5))
    .map((row) => ({
      id: Number(row.id),
      uid: row.uid,
      type: row.type,
      rawText: row.raw_text,
      rule: row.rule,
      confidence: Number(row.confidence),
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
}

export function getRecentChatMessages(input = {}) {
  const uid = sanitizeUid(input.uid);
  const limit = clampInteger(input.limit, 1, 100, 12);
  return getDatabase()
    .prepare(`
      SELECT *
      FROM chat_messages
      WHERE uid = ?
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(uid, limit)
    .reverse()
    .map((row) => ({
      id: Number(row.id),
      uid: row.uid,
      sessionId: row.session_id,
      role: row.role,
      text: row.text,
      mood: row.mood,
      heartScore: row.heart_score === null ? null : Number(row.heart_score),
      intimacy: row.intimacy,
      source: row.source,
      clientTime: row.client_time,
      createdAt: row.created_at
    }));
}

export function moveUidData(input) {
  const fromUid = sanitizeUid(input?.fromUid);
  const toUid = sanitizeUid(input?.toUid);
  if (fromUid === toUid) {
    return {
      fromUid,
      toUid,
      moved: {
        chatMessages: 0,
        conversationSummaries: 0,
        memories: 0,
        corrections: 0
      }
    };
  }

  const db = getDatabase();
  const targetRows = countUidRows(db, toUid);
  if (Object.values(targetRows).some((count) => count > 0)) {
    const error = new Error('target uid already has data');
    error.statusCode = 409;
    error.details = targetRows;
    throw error;
  }

  const moved = {};
  db.exec('BEGIN');
  try {
    moved.chatMessages = db
      .prepare(`
        UPDATE chat_messages
        SET uid = ?,
            session_id = CASE WHEN session_id = ? THEN ? ELSE session_id END
        WHERE uid = ?
      `)
      .run(toUid, fromUid, toUid, fromUid).changes;

    moved.conversationSummaries = db
      .prepare(`
        UPDATE conversation_summaries
        SET uid = ?,
            session_id = CASE WHEN session_id = ? THEN ? ELSE session_id END
        WHERE uid = ?
      `)
      .run(toUid, fromUid, toUid, fromUid).changes;

    moved.memories = db.prepare('UPDATE memories SET uid = ? WHERE uid = ?').run(toUid, fromUid).changes;
    moved.corrections = db.prepare('UPDATE corrections SET uid = ? WHERE uid = ?').run(toUid, fromUid).changes;
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { fromUid, toUid, moved };
}

export function resetUidData(input) {
  const uid = sanitizeUid(input?.uid);
  const db = getDatabase();
  const cleared = {};

  db.exec('BEGIN');
  try {
    cleared.memoryLinks = db
      .prepare(`
        DELETE FROM memory_links
        WHERE from_memory_id IN (SELECT id FROM memories WHERE uid = ?)
           OR to_memory_id IN (SELECT id FROM memories WHERE uid = ?)
      `)
      .run(uid, uid).changes;
    cleared.chatMessages = db.prepare('DELETE FROM chat_messages WHERE uid = ?').run(uid).changes;
    cleared.conversationSummaries = db.prepare('DELETE FROM conversation_summaries WHERE uid = ?').run(uid).changes;
    cleared.memories = db.prepare('DELETE FROM memories WHERE uid = ?').run(uid).changes;
    cleared.corrections = db.prepare('DELETE FROM corrections WHERE uid = ?').run(uid).changes;
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { uid, cleared };
}

function rowToMemory(row) {
  return {
    id: Number(row.id),
    uid: row.uid,
    level: row.level,
    type: row.type,
    text: row.text,
    normalizedText: row.normalized_text,
    tags: parseJsonArray(row.tags_json),
    source: row.source,
    sourceMessageIds: parseJsonArray(row.source_message_ids_json),
    confidence: Number(row.confidence),
    importance: Number(row.importance),
    durability: Number(row.durability),
    status: row.status,
    pinned: Boolean(row.pinned),
    useCount: Number(row.use_count),
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeMemoryUidFilter(uid) {
  if (typeof uid === 'undefined' || uid === null || String(uid).trim() === '') {
    return { mode: 'all' };
  }

  const text = String(uid).trim().toLowerCase();
  if (text === 'global') return { mode: 'global' };
  return { mode: 'uid', uid: sanitizeUid(text) };
}

function countUidRows(db, uid) {
  return {
    chatMessages: countRows(db, 'chat_messages', uid),
    conversationSummaries: countRows(db, 'conversation_summaries', uid),
    memories: countRows(db, 'memories', uid),
    corrections: countRows(db, 'corrections', uid)
  };
}

function countRows(db, table, uid) {
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE uid = ?`).get(uid).count);
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clampInteger(value, min, max, fallback) {
  if (value === '' || value === null || typeof value === 'undefined') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clampNumber(value, min, max, fallback) {
  if (value === '' || value === null || typeof value === 'undefined') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
