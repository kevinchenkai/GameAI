import { getIntimacyLevel, getLifeScene, getRequestDate } from './prompt.js';

const offlineReplies = {
  morning: [
    '(揉揉眼睛) 早呀，先慢慢醒，我在这儿陪你。',
    '(看了眼手机) 早安宝宝，今天也别空着肚子去忙。'
  ],
  day: [
    '(捧着水杯看手机) 我也在公司忙呢，看到你消息就开心。',
    '(托着下巴) 你先忙 Seed 的事，我隔着屏幕陪你。'
  ],
  evening: [
    '(收拾了一下包) 下班了吗？今天辛苦啦。',
    '(看了眼时间) 等会儿回知春路，再慢慢抱你一下。'
  ],
  night: [
    '(轻轻靠过来) 这么晚啦，慢慢说，我陪你一会儿。',
    '(把被角拉好) 我在呢，说完就早点睡，好不好？'
  ]
};

export function fallbackReply(payload) {
  const date = getRequestDate(payload.clientTime);
  const phase = getTimePhase(date);
  const text = String(payload.message || '').toLowerCase();
  const intimacy = getIntimacyLevel(Number(payload.heartScore) || 0, payload.intimacy);

  if (isChoiceQuestion(text)) return choiceFallbackReply(payload.message);
  if (isPreferenceInput(text)) return preferenceFallbackReply(date);
  if (isPlanInput(text)) return planFallbackReply(text, date);

  if (detectMood(text) === 'angry') {
    return randomFrom([
      '(轻轻戳你一下) 哼，有点小生气，但你认真哄我就好。',
      intimacy.min >= 140 ? '(抬眼看你) 我有一点点不开心，你抱紧点我就心软。' : '(鼓了鼓脸) 那你要好好哄我一下。'
    ]);
  }

  if (/难受|累|烦|不开心|压力|焦虑|想哭/.test(text)) {
    return randomFrom([
      '(轻轻捏捏你的手) 我听着呢，你不用一个人硬撑。',
      '(把水杯递给你) 辛苦啦，先喝一口，慢慢跟我说。',
      intimacy.min >= 220 ? '(靠近一点) 今天先别逞强，我陪你缓一会儿。' : '(看着你) 没事，慢慢来，我在。'
    ]);
  }

  if (detectMood(text) === 'cute') {
    return randomFrom([
      '(声音软下来) 好呀，等我一下，我也想贴贴。',
      '(弯着眼睛) 可以呀，今天就多陪你一小会儿。',
      intimacy.min >= 140 ? '(靠近一点) 过来嘛，我今天也想黏你。' : '(轻轻牵你) 好呀，抱一下。'
    ]);
  }

  if (/加班|工作|忙|字节|seed|腾讯|产品/.test(text)) {
    return '(看了眼电脑) 辛苦啦，我们都先把手头忙完，别忘了喝水。';
  }

  if (/康康|猫/.test(text)) {
    return '(看了眼康康) 它也在旁边陪着呢，我认真听你说。';
  }

  return randomFrom(offlineReplies[phase] || offlineReplies.night);
}

function getTimePhase(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 8) return 'morning';
  if (hour >= 9 && hour <= 16) return 'day';
  if (hour >= 17 && hour <= 19) return 'evening';
  return 'night';
}

function detectMood(text) {
  if (/烦|讨厌|不理你|坏|分手|骂|惹你|生气|你走|别烦|滚|气死|敷衍/.test(text)) return 'angry';
  if (/难受|累|疲惫|委屈|压力|焦虑|不开心|失眠|想哭|崩溃/.test(text)) return 'cute';
  if (/撒娇|抱抱|抱|陪我|想亲|哄我|宝宝|老婆|贴贴|亲一下|抱一下|亲亲|想你了/.test(text)) return 'cute';
  return 'happy';
}

function isChoiceQuestion(text) {
  return /哪个|哪一个|选哪个|选哪|二选一|还是|or|vs/.test(text);
}

function isPlanInput(text) {
  return /去|看|吃|玩|逛|约|周末|今晚|明天|一起|要不要/.test(text);
}

function isPreferenceInput(text) {
  return /喜欢什么|想要什么|想吃什么|想看什么|想去哪|你喜欢|你想/.test(text);
}

function planFallbackReply(text, date) {
  const scene = getLifeScene(date);
  const later = scene.key === 'work' ? '下班后' : '等会儿';
  if (/吃|饭|餐|菜|火锅|烧烤|咖啡|奶茶/.test(text)) {
    return scene.key === 'work'
      ? `(看了眼日程) 好呀，${later}去吃，我现在先乖乖上班。`
      : '(眼睛一亮) 好呀，和你慢慢吃饭最舒服。';
  }
  if (/看|电影|展|演出|剧|球/.test(text)) {
    return scene.key === 'work'
      ? `(隔着屏幕笑) 可以呀，${later}一起看。`
      : '(凑近一点) 可以呀，和你一起看什么都开心。';
  }
  if (/逛|走|散步|公园|商场|菜市场/.test(text)) {
    return scene.key === 'work'
      ? `(托着下巴) 好呀，${later}再慢慢逛。`
      : '(牵住你的手) 好呀，我想跟你慢慢走一会儿。';
  }
  return scene.key === 'work'
    ? `(看着手机笑) 好呀，${later}再说，我先把工作收一下。`
    : '(笑着点头) 好呀，只要和你一起就行。';
}

function preferenceFallbackReply(date) {
  return getLifeScene(date).key === 'work'
    ? '(托着下巴) 我喜欢轻松一点的，下班后和你一起就行。'
    : '(歪头想了想) 我喜欢轻松一点的，主要是想和你待在一起。';
}

function choiceFallbackReply(input) {
  const options = parseChoiceOptions(input);
  if (options.length >= 2) {
    return `(歪头想了想) 我选${pickChoiceOption(options)}，感觉更适合今天。`;
  }
  return '(歪头想了想) 我帮你选后面那个吧，感觉更有新鲜感。';
}

function parseChoiceOptions(input) {
  return String(input)
    .replace(/[？?。！!，,]/g, ' ')
    .split(/和|还是|或者|or|vs|、|\/|\s+/i)
    .map((item) => item.trim())
    .filter((item) => item && !/咱们|咱俩|我们|看|去哪|哪个|哪一个|选|想|要不要/.test(item))
    .slice(0, 3);
}

function pickChoiceOption(options) {
  return options[stableTextSeed(options.join('|')) % options.length] || options[0];
}

function stableTextSeed(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}
