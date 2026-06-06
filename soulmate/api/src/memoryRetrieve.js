import { config } from './config.js';
import { listEnabledCorrections, listRetrievableMemoriesForUid, markMemoriesUsed, normalizeText, sanitizeUid } from './memoryStore.js';

export function emptyMemoryContext() {
  return {
    memories: [],
    summaries: [],
    corrections: [],
    keywords: []
  };
}

export function retrieveMemoryContext(payload = {}) {
  if (!config.memory.enabled) return emptyMemoryContext();

  const uid = sanitizeUid(payload.uid);
  const queryText = buildQueryText(payload);
  const keywords = extractKeywords(queryText);
  const normalizedQuery = normalizeText(queryText);
  const memories = listRetrievableMemoriesForUid(uid, 240);
  const scored = memories
    .map((memory) => ({
      memory,
      ...scoreMemory(memory, { keywords, normalizedQuery, queryText })
    }))
    .filter((item) => item.hits > 0 || item.memory.pinned || item.memory.level === 'L1')
    .filter((item) => item.score >= 6 || item.memory.pinned || item.memory.level === 'L1')
    .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance);

  const selected = pickMemories(scored.map((item) => item.memory));
  const summaries = selected.filter((memory) => memory.level === 'L4').slice(0, 1);
  const regularMemories = selected.filter((memory) => memory.level !== 'L4').slice(0, 8);
  const corrections = listEnabledCorrections(uid, 5);

  return {
    memories: regularMemories,
    summaries,
    corrections,
    keywords
  };
}

export function markMemoryContextUsed(context) {
  const ids = [
    ...(context?.memories || []),
    ...(context?.summaries || [])
  ].map((memory) => memory.id);
  markMemoriesUsed(ids);
}

function buildQueryText(payload) {
  const recent = Array.isArray(payload.recentMessages) ? payload.recentMessages : [];
  const recentText = recent
    .slice(-3)
    .map((item) => item?.text || '')
    .join(' ');

  return [
    payload.message || '',
    recentText,
    payload.mood || '',
    payload.intimacy || ''
  ].join(' ');
}

function scoreMemory(memory, query) {
  const tagText = memory.tags.join(' ');
  const normalizedMemory = normalizeText(`${memory.text} ${tagText}`);
  let score = Number(memory.importance) * 1.5;
  let hits = 0;

  if (memory.pinned) score += 10;
  if (memory.level === 'L1') score += 6;
  if (memory.level === 'L4') score += 2;

  if (query.normalizedQuery && normalizedMemory.includes(query.normalizedQuery)) {
    score += 8;
    hits += 1;
  }

  for (const tag of memory.tags) {
    const normalizedTag = normalizeText(tag);
    if (!normalizedTag) continue;
    if (query.normalizedQuery.includes(normalizedTag) || normalizeText(query.queryText).includes(normalizedTag)) {
      score += 4;
      hits += 1;
    }
  }

  for (const keyword of query.keywords) {
    if (keyword.length < 2) continue;
    if (normalizedMemory.includes(keyword)) {
      score += 3;
      hits += 1;
    }
  }

  if (!hits && !memory.pinned && memory.level !== 'L1') score -= 4;
  if (!hits && memory.level === 'L3') score -= 4;
  if (memory.lastUsedAt) score += 0.5;

  return { score, hits };
}

function pickMemories(memories) {
  const result = [];
  const limits = {
    L1: 4,
    L2: 5,
    L3: 4,
    L4: 1,
    L5: 0
  };
  const counts = {
    L1: 0,
    L2: 0,
    L3: 0,
    L4: 0,
    L5: 0
  };

  for (const memory of memories) {
    if (counts[memory.level] >= limits[memory.level]) continue;
    if (result.length >= 9) break;
    result.push(memory);
    counts[memory.level] += 1;
  }

  return result;
}

function extractKeywords(value) {
  const text = String(value || '').toLowerCase();
  const keywords = new Set();
  const latin = text.match(/[a-z0-9][a-z0-9+#._-]{1,}/g) || [];
  latin.forEach((item) => keywords.add(normalizeText(item)));

  const cjkChunks = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  for (const chunk of cjkChunks) {
    const normalized = normalizeText(chunk);
    if (normalized.length <= 6) {
      keywords.add(normalized);
      continue;
    }
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index <= normalized.length - size; index += 1) {
        keywords.add(normalized.slice(index, index + size));
      }
    }
  }

  return [...keywords].filter(Boolean).slice(0, 40);
}
