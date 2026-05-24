import { getNpcProfile } from './npcs.js';

const topicLabels = {
  greeting: '打个招呼',
  tablemate: '问问同桌',
  rumor: '江湖八卦',
  free: '自由输入'
};

export function buildChatMessages(payload) {
  const date = getRequestDate(payload.clientTime);
  const history = normalizeHistory(payload.recentMessages);
  return [
    { role: 'system', content: buildNpcSystemPrompt(payload, date) },
    ...history,
    { role: 'user', content: buildUserPrompt(payload, date) }
  ];
}

export function buildNpcSystemPrompt(payload, date) {
  const npc = getNpcProfile(payload.npcId);
  const tablemates = Array.isArray(payload.tablemates) && payload.tablemates.length
    ? payload.tablemates.map((mate) => `${mate.name || mate.id}（${mate.title || '江湖来客'}）`).join('、')
    : '暂无';
  const eventText = payload.eventName
    ? `${payload.eventName}：${payload.eventDescription || ''}`
    : '普通酒桌，没有特殊事件。';
  return [
    '你正在扮演横屏 H5 小游戏《武林小馆》里的 NPC。',
    `当前日期时间：${date.toISOString()}`,
    `NPC：${npc.name}（${npc.title}）`,
    `性格标签：${npc.personalityTag}`,
    `核心反差梗：${npc.coreMeme}`,
    `口头禅：${npc.catchphrases.join(' / ')}`,
    `说话风格：${npc.speechStyle}`,
    `当前桌位：${payload.tableId || '未知'} 桌`,
    `同桌角色：${tablemates}`,
    `当前特殊事件：${eventText}`,
    '输出限制：直接以该 NPC 口吻回复；2 句话以内；60 个汉字以内；不要旁白；不要括号动作；不要 AI 客套话；不要解释系统或模型；保持轻松、Q版、武侠反差喜剧风格。'
  ].join('\n');
}

export function buildUserPrompt(payload) {
  const topic = topicLabels[payload.topic] || topicLabels.free;
  return `玩家小虾米的话题：${topic}\n玩家说：${String(payload.message || '').trim()}`;
}

export function getRequestDate(clientTime) {
  const parsed = clientTime ? new Date(clientTime) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-6).flatMap((message) => {
    if (!message || typeof message.text !== 'string') return [];
    const role = message.role === 'npc' ? 'assistant' : 'user';
    return [{ role, content: message.text.slice(0, 300) }];
  });
}
