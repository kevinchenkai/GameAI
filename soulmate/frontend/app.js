const APP_VERSION = 'v0.4.4';
const ASSET_VERSION = '20260602-reset';
const SHARE_TITLE = '心动陪伴';
const SHARE_DESC = '一个只属于我们的手机陪伴小游戏，打开就能和她说说话。';
const SHARE_IMAGE = `images/share-cover.png?v=${ASSET_VERSION}`;
const SOULMATE_API_CHAT = '/api/chat';

const STORAGE_KEYS = {
  uid: 'soulmate.uid',
  started: 'soulmate.started',
  messages: 'soulmate.messages',
  heart: 'soulmate.heart',
  imageIndex: 'soulmate.imageIndex',
  dailySign: 'soulmate.dailySign',
  musicMuted: 'soulmate.musicMuted',
  stageCeremonies: 'soulmate.stageCeremonies'
};

const mateImages = [
  'images/mate001.jpg',
  'images/mate002.jpg',
  'images/mate003.jpg',
  'images/mate004.jpg',
  'images/mate005.jpg',
  'images/mate006.jpg'
];

const moodCopy = {
  happy: ['我在呢。', '今天也要想我。', '见到你就开心。', '笑一下嘛。', '你一来我就安心了。'],
  angry: ['哼，要哄我一下。', '坏蛋，过来解释一下。', '我有一点点小脾气了。', '不许敷衍我哦。'],
  cute: ['抱一下嘛。', '贴贴一会儿。', '想赖着你。', '宝宝，陪我说说话。', '过来，我想靠你近一点。']
};

const offlineReplies = {
  morning: [
    '(揉揉眼睛凑过来) 早呀，刚醒就想到你了。今天慢慢来，我在这儿陪你。',
    '(把康康从枕边抱开) 早安呀宝宝，记得吃早饭，不许空着肚子去忙 Seed 的事。'
  ],
  day: [
    '(捧着水杯看手机) 我在腾讯这边也忙着呢，看到你消息就开心。',
    '(看了眼电脑右下角) 你先忙 Seed 的事，下班后我再黏你。'
  ],
  evening: [
    '(收拾了一下包) 下班了吗？今天辛苦啦，想听你讲讲发生了什么。',
    '(看了眼窗外天色) 北京天快暗下来了，等会儿回知春路慢慢待一会儿。'
  ],
  night: [
    '(把被角给你掖好) 这么晚啦，抱抱你。说完这几句就早点睡，好不好？',
    '(轻轻靠到你身边) 我在呢，陪你一小会儿。别把自己熬太累，我会担心。'
  ]
};

const INTIMACY_LEVELS = [
  {
    key: 'companion',
    min: 0,
    name: '陪伴期',
    tone: '温柔日常',
    prompt: '亲密度较轻，像刚打开陪伴空间时的温柔女友，日常、自然、不过分黏。',
    actionGuide: '动作描写偏轻：坐近一点、递水、摸摸头、陪他说话。',
    moodText: { happy: '她在陪你', angry: '她有一点小脾气', cute: '她想贴贴' },
    tap: {
      happy: ['她笑了一下。', '她轻轻看向你。'],
      angry: ['她鼓了鼓脸，等你哄。'],
      cute: ['她靠近了一点。']
    },
    photoSystem: ['她凑近了一点。', '心动值悄悄加了一点。'],
    longNote: '抱一下嘛',
    longReply: '(坐近一点看着你) 抱一下嘛，我今天也很想你。',
    idle: ['她还在这儿等你说话。'],
    quickActions: [
      { label: '抱抱', text: '抱抱我一下嘛' },
      { label: '陪我', text: '我有点累，想让你陪陪我' },
      { label: '夸夸', text: '老婆夸夸我' },
      { label: '亲亲', text: '亲一下' }
    ],
    proactive: ['(坐近一点陪你) 想说话就叫我。', '(抱着康康乖乖坐好) 你先忙你的，我会陪着你。']
  },
  {
    key: 'close',
    min: 80,
    name: '贴近期',
    tone: '主动关心',
    prompt: '亲密度中等，可以更主动关心用户，多一点撒娇和陪伴感。',
    actionGuide: '动作描写更亲近：靠肩、牵手、蹭蹭、帮他整理衣领。',
    moodText: { happy: '她很惦记你', angry: '她要你认真哄', cute: '她想靠近你' },
    tap: {
      happy: ['她眼睛弯弯地看着你。', '她小声说，今天也想你。'],
      angry: ['她哼了一声，但没有躲开。'],
      cute: ['她把声音放软了一点。', '她想被你抱一下。']
    },
    photoSystem: ['她靠近了一点。', '你们之间的距离更近了。'],
    longNote: '抱紧一点',
    longReply: '(轻轻牵住你的手) 抱紧一点嘛。你今天辛苦的话，就先靠我这儿休息一下。',
    idle: ['她轻轻看了你一眼。', '她还在等你说话。'],
    quickActions: [
      { label: '贴贴', text: '想和你贴贴一会儿' },
      { label: '哄我', text: '哄哄我嘛，想听你温柔一点说话' },
      { label: '想你', text: '我想你了，陪我说说话' },
      { label: '夸夸', text: '老婆夸夸我' }
    ],
    proactive: ['(轻轻牵住你的手) 你刚刚是不是有点累？要不要抱一下。', '(靠着沙发等你) 我在这儿，想听你讲今天的小事。']
  },
  {
    key: 'heartbeat',
    min: 140,
    name: '心动期',
    tone: '亲密撒娇',
    prompt: '亲密度较高，回复可以更亲密、更撒娇，像热恋中会认真哄人的女朋友。',
    actionGuide: '动作描写可以更软：抱久一点、贴近撒娇、凑到耳边说悄悄话。',
    moodText: { happy: '她满眼都是你', angry: '她要你贴近哄', cute: '她想黏着你' },
    tap: {
      happy: ['她笑着凑近你，像是等一个亲亲。'],
      angry: ['她小声哼你，但手还牵着你。'],
      cute: ['她软软地靠过来。', '她想赖在你身边。']
    },
    photoSystem: ['她轻轻抱住你。', '空气里多了一点心动。'],
    longNote: '让我靠一会儿',
    longReply: '(软软地靠到你身边) 让我靠一会儿。你不用说很多，我抱着你就好。',
    idle: ['她把额头轻轻贴近你。', '她小声问，你是不是在想我。'],
    quickActions: [
      { label: '靠近', text: '靠近一点嘛，想听你声音' },
      { label: '亲一下', text: '亲一下嘛，今天想被你哄' },
      { label: '撒娇', text: '我想听你撒娇，也想对你撒娇' },
      { label: '陪睡', text: '今晚陪我说到困好不好' }
    ],
    proactive: ['(抱着康康挪到你旁边) 我想你了，过来陪我一会儿。', '(悄悄看了你好几眼) 刚刚没说话的时候，我也在偷偷想你。']
  },
  {
    key: 'romance',
    min: 220,
    name: '热恋期',
    tone: '黏人热恋',
    prompt: '亲密度很高，回复可以更黏人、更偏热恋，但仍然自然、克制、不过度露骨。',
    actionGuide: '动作描写偏热恋：从背后抱住、晚安吻、赖着他、想他早点回家。',
    moodText: { happy: '她想一直陪你', angry: '她要你抱着哄', cute: '她赖着你不走' },
    tap: {
      happy: ['她弯着眼睛说，今天你归我。'],
      angry: ['她故意小小生气，等你抱紧一点。'],
      cute: ['她贴过来，声音软得不像话。']
    },
    photoSystem: ['她把你抱得更紧了一点。', '她说，今晚多陪我一会儿。'],
    longNote: '不许松开',
    longReply: '(从背后抱住你) 不许松开。今天你要归我抱一会儿，我慢慢哄你。',
    idle: ['她轻轻拽了拽你，像是不想你走神。'],
    quickActions: [
      { label: '抱紧', text: '抱紧我，不许马上松开' },
      { label: '说爱我', text: '说一句你爱我，我想听' },
      { label: '晚安吻', text: '给我一个晚安吻嘛' },
      { label: '只陪我', text: '今晚只陪我一小会儿，好不好' }
    ],
    proactive: ['(从沙发那边挪过来抱住你) 我想你了，陪我一会儿嘛。', '(轻轻捏捏你的手) 今天你归我哄，别一个人硬撑。']
  },
  {
    key: 'exclusive',
    min: 320,
    name: '专属期',
    tone: '只属于你',
    prompt: '亲密度最高，回复有强烈专属感和安心陪伴感，像只属于用户的温柔恋人。',
    actionGuide: '动作描写要有同居和专属感：知春路的小家、康康、被窝、沙发、只想赖着他。',
    moodText: { happy: '她只想陪着你', angry: '她撒娇等你哄', cute: '她把你当成专属' },
    tap: {
      happy: ['她贴近你，像整个世界都安静了。'],
      angry: ['她小声说，不许敷衍你的女朋友。'],
      cute: ['她靠在你身边，舍不得离开。']
    },
    photoSystem: ['她把最温柔的一面留给你。', '这是只属于你们的一小会儿。'],
    longNote: '今晚陪着我',
    longReply: '(靠进被窝里看着你) 今晚陪着我嘛。我也陪着你，什么烦心事都先放到我这里。',
    idle: ['她还在，很安静地陪着你。'],
    quickActions: [
      { label: '我的专属', text: '你是我的专属，要最喜欢我' },
      { label: '今晚陪我', text: '今晚陪着我，不许一个人乱想' },
      { label: '不许走', text: '不许走，再陪我一会儿' },
      { label: '最喜欢你', text: '我最喜欢你了，你也要告诉我' }
    ],
    proactive: ['(顺手把康康从你键盘边抱开) 我今晚就赖着你，不许一个人乱想。', '(靠进被窝里) 别熬太晚，我陪你说完这几句就睡。']
  }
];

const state = {
  uid: '',
  started: false,
  messages: [],
  mood: 'happy',
  heartDate: '',
  heartScore: 0,
  imageIndex: 0,
  pending: false,
  pressTimer: 0,
  tapNoteTimer: 0,
  idleTimer: 0,
  proactiveTimer: 0,
  idleCount: 0,
  lastProactiveAt: 0,
  lastIntimacyKey: '',
  keyboardTimer: 0,
  maxViewportHeight: 0,
  musicMuted: false
};

const els = {};

document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateClock();
    updateHeartUi();
    resetIdleTimer();
    settleMessagesAfterLayout();
  }
});

function initApp() {
  bindElements();
  syncVersionLabels();
  setupShareStyle();
  loadState();
  bindEvents();
  setupKeyboardMode();
  updateClock();
  setInterval(updateClock, 1000);
  setMood(state.mood, { silent: true });
  renderMateExpression(state.mood);
  renderMessages();
  updateHeartUi();
  syncMusicState();
  resetIdleTimer();
  scheduleProactiveCare();

  if (state.started) {
    enterGame();
  } else {
    showStartScreen();
  }
}

function bindElements() {
  Object.assign(els, {
    startScreen: document.getElementById('startScreen'),
    gameScreen: document.getElementById('gameScreen'),
    startVersion: document.getElementById('startVersion'),
    startButton: document.getElementById('startButton'),
    aboutButton: document.getElementById('aboutButton'),
    settingsButton: document.getElementById('settingsButton'),
    musicButton: document.getElementById('musicButton'),
    bgmAudio: document.getElementById('bgmAudio'),
    startClock: document.getElementById('startClock'),
    clockText: document.getElementById('clockText'),
    dateText: document.getElementById('dateText'),
    photoButton: document.getElementById('photoButton'),
    mateImage: document.getElementById('mateImage'),
    tapNote: document.getElementById('tapNote'),
    heartScore: document.getElementById('heartScore'),
    intimacyLabel: document.getElementById('intimacyLabel'),
    moodText: document.getElementById('moodText'),
    messages: document.getElementById('messages'),
    quickActions: document.querySelector('.quick-actions'),
    stageCeremony: document.getElementById('stageCeremony'),
    stageTitle: document.getElementById('stageTitle'),
    stageSubtitle: document.getElementById('stageSubtitle'),
    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton')
  });
}

function syncVersionLabels() {
  els.startVersion.textContent = APP_VERSION;
  els.aboutButton.textContent = APP_VERSION;
}

function setupShareStyle() {
  const share = getShareData();
  updateMeta('name:description', share.desc);
  updateMeta('itemprop:name', share.title);
  updateMeta('itemprop:description', share.desc);
  updateMeta('itemprop:image', share.imgUrl);
  updateMeta('property:og:title', share.title);
  updateMeta('property:og:description', share.desc);
  updateMeta('property:og:image', share.imgUrl);
  updateMeta('property:og:url', share.link);
  updateMeta('name:twitter:title', share.title);
  updateMeta('name:twitter:description', share.desc);
  updateMeta('name:twitter:image', share.imgUrl);
  configureWeChatShare(share);
}

function getShareData() {
  return {
    title: SHARE_TITLE,
    desc: SHARE_DESC,
    link: window.location.href.split('#')[0],
    imgUrl: new URL(SHARE_IMAGE, window.location.href).href
  };
}

function updateMeta(selector, content) {
  const index = selector.indexOf(':');
  const attr = selector.slice(0, index);
  const name = selector.slice(index + 1);
  let meta = document.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function configureWeChatShare(share) {
  const wx = window.wx;
  if (!wx || typeof wx.ready !== 'function') return;

  wx.ready(() => {
    if (typeof wx.updateAppMessageShareData === 'function') {
      wx.updateAppMessageShareData(share);
    }
    if (typeof wx.updateTimelineShareData === 'function') {
      wx.updateTimelineShareData({
        title: `${share.title} - ${share.desc}`,
        link: share.link,
        imgUrl: share.imgUrl
      });
    }
    if (typeof wx.onMenuShareAppMessage === 'function') {
      wx.onMenuShareAppMessage(share);
    }
    if (typeof wx.onMenuShareTimeline === 'function') {
      wx.onMenuShareTimeline({
        title: `${share.title} - ${share.desc}`,
        link: share.link,
        imgUrl: share.imgUrl
      });
    }
  });
}

function bindEvents() {
  els.startButton.addEventListener('click', () => {
    noteInteraction();
    state.started = true;
    localStorage.setItem(STORAGE_KEYS.started, '1');
    enterGame();
  });

  els.aboutButton.addEventListener('click', () => {
    noteInteraction();
    showStartScreen();
  });
  if (els.settingsButton) {
    els.settingsButton.addEventListener('click', noteInteraction);
  }
  els.musicButton.addEventListener('click', toggleMusic);
  els.chatForm.addEventListener('submit', sendMessage);
  if (els.quickActions) {
    els.quickActions.addEventListener('click', handleQuickAction);
  }
  els.messageInput.addEventListener('input', noteInteraction);
  els.messageInput.addEventListener('keydown', noteInteraction);
  els.messageInput.addEventListener('focus', () => {
    noteInteraction();
    updateKeyboardModeFromViewport();
    setTimeout(scrollMessagesToBottom, 180);
  });
  els.messageInput.addEventListener('blur', () => {
    window.clearTimeout(state.keyboardTimer);
    state.keyboardTimer = window.setTimeout(updateKeyboardModeFromViewport, 180);
  });
  els.mateImage.addEventListener('load', settleMessagesAfterLayout);

  els.photoButton.addEventListener('click', () => {
    if (state.pressTimer) return;
    noteInteraction();
    const intimacy = getIntimacyLevel();
    const mood = Math.random() > 0.45 ? 'cute' : 'happy';
    setMood(mood);
    rotateMateImage();
    updateHeartScore(2);
    showTapNote(randomFrom(intimacy.tap[mood] || moodCopy[mood]));
    addMessage('system', randomFrom(intimacy.photoSystem));
    burstHearts();
  });

  els.photoButton.addEventListener('pointerdown', () => {
    noteInteraction();
    state.pressTimer = window.setTimeout(() => {
      state.pressTimer = 0;
      const intimacy = getIntimacyLevel();
      setMood('cute');
      rotateMateImage();
      updateHeartScore(4);
      showTapNote(intimacy.longNote);
      addMessage('her', intimacy.longReply);
      burstHearts();
    }, 520);
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
    els.photoButton.addEventListener(eventName, () => {
      if (state.pressTimer) {
        window.clearTimeout(state.pressTimer);
        state.pressTimer = 0;
      }
    });
  });
}

function setupKeyboardMode() {
  state.maxViewportHeight = getViewportHeight();
  window.addEventListener('resize', updateKeyboardModeFromViewport, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.clearTimeout(state.keyboardTimer);
    state.keyboardTimer = window.setTimeout(() => {
      state.maxViewportHeight = getViewportHeight();
      updateKeyboardModeFromViewport();
    }, 280);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateKeyboardModeFromViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', updateKeyboardModeFromViewport, { passive: true });
  }
}

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
}

function updateKeyboardModeFromViewport() {
  if (!shouldUseKeyboardMode()) {
    setKeyboardOpen(false);
    state.maxViewportHeight = getViewportHeight();
    return;
  }

  const currentHeight = getViewportHeight();
  if (currentHeight > state.maxViewportHeight) {
    state.maxViewportHeight = currentHeight;
  }

  const focused = document.activeElement === els.messageInput;
  const dropped = state.maxViewportHeight - currentHeight > 120;
  const compressed = state.maxViewportHeight > 0 && currentHeight < state.maxViewportHeight * 0.78;
  setKeyboardOpen(Boolean(focused || dropped || compressed));
}

function shouldUseKeyboardMode() {
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const noHover = window.matchMedia?.('(hover: none)').matches;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  return Boolean((coarsePointer && noHover) || mobileUserAgent);
}

function setKeyboardOpen(isOpen) {
  const wasOpen = document.body.classList.contains('keyboard-open');
  document.body.classList.toggle('keyboard-open', Boolean(isOpen));
  if (isOpen) {
    settleMessagesAfterLayout();
  } else if (wasOpen) {
    settleMessagesAfterLayout();
  }
}

function showStartScreen() {
  els.startScreen.classList.remove('is-hidden');
  els.gameScreen.classList.add('is-hidden');
}

function enterGame() {
  els.startScreen.classList.add('is-hidden');
  els.gameScreen.classList.remove('is-hidden');
  updateClock();
  ensureWelcomeMessage();
  playBgm();
  resetIdleTimer();
  scheduleProactiveCare();
  settleMessagesAfterLayout();
}

function toggleMusic() {
  noteInteraction();
  const shouldPlay = state.musicMuted || els.bgmAudio.paused;
  state.musicMuted = !shouldPlay;
  localStorage.setItem(STORAGE_KEYS.musicMuted, state.musicMuted ? '1' : '0');
  syncMusicState();
  if (shouldPlay) {
    playBgm();
  } else {
    els.bgmAudio.pause();
  }
}

function syncMusicState() {
  els.bgmAudio.loop = true;
  els.bgmAudio.volume = 0.42;
  els.bgmAudio.muted = state.musicMuted;
  els.musicButton.classList.toggle('is-muted', state.musicMuted);
  els.musicButton.setAttribute('aria-pressed', state.musicMuted ? 'true' : 'false');
  els.musicButton.setAttribute('aria-label', state.musicMuted ? '播放背景音乐' : '静音背景音乐');
}

async function playBgm() {
  if (state.musicMuted || !els.bgmAudio) return;

  try {
    els.bgmAudio.muted = false;
    await els.bgmAudio.play();
  } catch {
    els.musicButton.classList.add('is-muted');
    els.musicButton.setAttribute('aria-label', '播放背景音乐');
  }
}

function updateClock() {
  const now = new Date();
  const phase = getTimePhase(now);
  document.body.dataset.phase = phase;
  els.clockText.textContent = formatTime(now, true);
  els.startClock.textContent = formatTime(now, false);
  els.dateText.textContent = `${formatDate(now)}  ${getWeekday(now)}`;
  if (els.greetingText) {
    els.greetingText.textContent = getTimeGreeting(now);
  }
  ensureTodayHeart(now);
}

function getTimePhase(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 8) return 'morning';
  if (hour >= 9 && hour <= 16) return 'day';
  if (hour >= 17 && hour <= 19) return 'evening';
  return 'night';
}

function formatTime(date, withSeconds) {
  const parts = [date.getHours(), date.getMinutes()];
  if (withSeconds) parts.push(date.getSeconds());
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getWeekday(date) {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
}

function getTimeGreeting(date) {
  const phase = getTimePhase(date);
  const greetings = {
    morning: '早呀，康康也醒了。',
    day: '我在呢，忙完就和我说话。',
    evening: '下班了吗？知春路等你。',
    night: '早点睡，我靠着你。'
  };
  return greetings[phase];
}

function getLifeScene(date) {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const isWorkday = day >= 1 && day <= 5;
  const workStart = 9 * 60;
  const workEnd = 18 * 60 + 30;
  const commuteStart = 8 * 60;
  const eveningHome = 20 * 60;

  if (isWorkday && minutes >= workStart && minutes < workEnd) {
    return {
      key: 'work',
      summary: '工作日上班时间。她在北京腾讯公司办公室，用户在字节跳动 Seed 团队办公室。',
      actionRule: '动作只能是线上聊天或各自在公司里的动作，例如看手机、捧水杯、托腮、隔着屏幕笑；不要写靠在用户肩上、躺在用户怀里、在家抱康康、做饭等同处一地的动作。',
      placeRule: '不要说她在知春路家里，不要说用户已经在家；可以说“下班后”“晚上回知春路再……”作为未来安排。'
    };
  }

  if (isWorkday && minutes >= commuteStart && minutes < workStart) {
    return {
      key: 'commute',
      summary: '工作日上班前通勤/准备时间。两个人准备去各自公司。',
      actionRule: '可以写起床、收拾、通勤、看手机，不要默认已经在公司或已经一起出门。',
      placeRule: '如果提到见面，应是早上出门前或晚上下班后的安排。'
    };
  }

  if (isWorkday && minutes >= workEnd && minutes < eveningHome) {
    return {
      key: 'afterWork',
      summary: '工作日下班后到回家前。两个人可以准备下班、通勤、约饭或回知春路附近。',
      actionRule: '可以写收拾包、看路线、等你下班、见面后的安排；不要说已经在家，除非用户明确说已经到家。',
      placeRule: '可以自然提“下班后”“等会儿”“回知春路附近”。不要编造具体餐厅、影院、门店。'
    };
  }

  if (isWorkday && minutes >= eveningHome) {
    return {
      key: 'homeNight',
      summary: '工作日晚上，通常已经回到知春路附近的合租小家。',
      actionRule: '可以写沙发、被窝、康康、客厅小灯、靠近等居家动作。',
      placeRule: '可以在家陪伴或聊明天安排；不要说还在公司加班，除非用户明确提到。'
    };
  }

  if (isWorkday) {
    return {
      key: 'homeLate',
      summary: '深夜或清晨，通常在知春路附近的合租小家休息。',
      actionRule: '可以写被窝、轻声说话、康康、睡前陪伴。',
      placeRule: '不要安排立即外出；以休息和陪伴为主。'
    };
  }

  return {
    key: 'weekend',
    summary: '周末或休息日。两个人可以在知春路附近的家里，也可以一起外出。',
    actionRule: '可以写居家或外出计划，但不要编造具体店名、影院、票务、地址，除非用户先说。',
    placeRule: '如果用户提出计划，可以自然接住；如果没提地点，不要乱跳到具体地点。'
  };
}

function getIntimacyLevel(score = state.heartScore) {
  return [...INTIMACY_LEVELS]
    .reverse()
    .find((level) => score >= level.min) || INTIMACY_LEVELS[0];
}

function getMoodText(mood, level = getIntimacyLevel()) {
  return level.moodText[mood] || level.moodText.happy;
}

function getIntimacyDelta(base) {
  const levelIndex = INTIMACY_LEVELS.findIndex((level) => level.key === getIntimacyLevel().key);
  return base + Math.max(0, Math.floor(levelIndex / 2));
}

function renderQuickActions(level = getIntimacyLevel()) {
  if (!els.quickActions) return;
  els.quickActions.innerHTML = '';
  const fragment = document.createDocumentFragment();
  level.quickActions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.quick = action.text;
    button.textContent = action.label;
    fragment.appendChild(button);
  });
  els.quickActions.appendChild(fragment);
}

function setMood(mood, options = {}) {
  const nextMood = ['happy', 'angry', 'cute'].includes(mood) ? mood : 'happy';
  state.mood = nextMood;
  document.body.dataset.mood = nextMood;
  renderMateExpression(nextMood);

  els.moodText.textContent = getMoodText(nextMood);

  if (!options.silent) {
    showTapNote(randomFrom(moodCopy[nextMood]));
  }

  if (nextMood === 'angry') {
    window.setTimeout(() => {
      if (state.mood === 'angry') setMood('cute', { silent: true });
    }, 5200);
  }
}

function chooseMateImage() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.imageIndex));
  state.imageIndex = Number.isFinite(saved) ? saved % mateImages.length : 0;
  els.mateImage.src = mateImages[state.imageIndex];
}

function rotateMateImage() {
  state.imageIndex = (state.imageIndex + 1 + Math.floor(Math.random() * 2)) % mateImages.length;
  localStorage.setItem(STORAGE_KEYS.imageIndex, String(state.imageIndex));
  els.mateImage.style.opacity = '0.45';
  window.setTimeout(() => {
    els.mateImage.src = mateImages[state.imageIndex];
    els.mateImage.style.opacity = '1';
  }, 120);
}

function renderMateExpression() {
  chooseMateImage();
}

function detectMood(text) {
  const value = `${text}`.toLowerCase();
  const angry = ['烦', '讨厌', '不理你', '坏', '分手', '骂', '惹你', '生气', '你走', '别烦', '滚', '气死', '敷衍'];
  const cute = ['撒娇', '抱抱', '抱', '陪我', '想亲', '哄我', '宝宝', '老婆', '贴贴', '亲一下', '抱一下', '亲亲', '想你了'];
  const sad = ['难受', '累', '疲惫', '委屈', '压力', '焦虑', '不开心', '失眠', '想哭', '崩溃'];
  const happy = ['想你', '爱你', '开心', '喜欢', '早安', '晚安', '谢谢', '好棒', '漂亮', '老婆真好', '可爱', '厉害'];

  if (angry.some((word) => value.includes(word))) return 'angry';
  if (sad.some((word) => value.includes(word))) return 'cute';
  if (cute.some((word) => value.includes(word))) return 'cute';
  if (happy.some((word) => value.includes(word))) return 'happy';
  return state.mood === 'angry' ? 'cute' : 'happy';
}

function maybeShowCareCue(input) {
  const text = input.toLowerCase();
  const cues = [];
  if (['累', '疲惫', '压力', '焦虑', '难受', '不开心', '想哭'].some((word) => text.includes(word))) {
    cues.push('她认真听着，声音放得很轻。');
    els.moodText.textContent = '她想抱抱你';
  }
  if (['加班', '工作', '忙', '字节', 'seed', '团队', '腾讯', '产品'].some((word) => text.includes(word))) {
    cues.push('她记得提醒你喝水，也记得你在 Seed 很辛苦。');
    els.moodText.textContent = '她在惦记你';
  }
  if (['晚安', '睡', '困'].some((word) => text.includes(word))) {
    cues.push('她把灯光调柔了一点。');
    els.moodText.textContent = '她陪你入睡';
  }
  if (cues.length) {
    addMessage('system', randomFrom(cues));
  }
}

function handleQuickAction(event) {
  const button = event.target.closest('[data-quick]');
  if (!button) return;

  noteInteraction();
  sendText(button.dataset.quick || button.textContent.trim(), { fromQuickAction: true });
}

async function sendMessage(event) {
  event?.preventDefault();
  noteInteraction();
  if (state.pending) return;

  const input = els.messageInput.value.trim();
  if (!input) return;

  els.messageInput.value = '';
  await sendText(input);
}

async function sendText(input, options = {}) {
  if (state.pending) return;

  const userMood = detectMood(input);
  setMood(userMood);
  addMessage('me', input);
  updateHeartScore(userMood === 'angry' ? 1 : options.fromQuickAction ? getIntimacyDelta(4) : getIntimacyDelta(3));
  maybeShowCareCue(input);
  setPending(true);

  let reply = '';
  let result = {};
  let streamingIndex = -1;
  let streamedReply = '';
  try {
    result = await callSoulMateApi(input, (delta, fullText) => {
      if (!delta) return;
      removeTypingMessage();
      streamedReply = fullText;
      if (streamingIndex < 0) {
        streamingIndex = addMessage('her', '');
      }
      updateMessage(streamingIndex, streamedReply, { persist: false });
    });
    reply = result.reply;
  } catch (error) {
    console.warn('SoulMate API fallback:', error);
    reply = offlineReply(input, getTimePhase(new Date()));
    result = { source: 'local', heartDelta: 2 };
  }

  const cleanReply = normalizeReply(reply, input);
  if (streamingIndex >= 0) {
    updateMessage(streamingIndex, cleanReply);
  } else {
    addMessage('her', cleanReply);
  }
  const finalMood = ['happy', 'angry', 'cute'].includes(result.mood)
    ? result.mood
    : resolveMood(userMood, cleanReply);
  const heartDelta = Number(result.heartDelta);
  setMood(finalMood);
  updateHeartScore(Number.isFinite(heartDelta) ? heartDelta : 2);
  setPending(false);
  rotateMateImage();
  burstHearts();
  settleMessagesAfterLayout();
}

function setPending(isPending) {
  state.pending = isPending;
  els.sendButton.disabled = isPending;
  els.sendButton.textContent = isPending ? '等她' : '发送';
  if (isPending) {
    addMessage('system', '她正在回复...');
  } else {
    removeTypingMessage();
  }
}

function removeTypingMessage() {
  const index = state.messages.findIndex((item) => item.role === 'system' && item.text === '她正在回复...');
  if (index >= 0) {
    state.messages.splice(index, 1);
    persistMessages();
    renderMessages();
  }
}

function buildSoulMateApiPayload(input) {
  const recentMessages = state.messages
    .filter((item) => item.role === 'me' || item.role === 'her')
    .filter((item, index, items) => {
      const isCurrentInput = index === items.length - 1 && item.role === 'me' && item.text === input;
      return !isCurrentInput;
    })
    .slice(-12)
    .map((item) => ({
      role: item.role,
      text: item.text
    }));

  return {
    uid: state.uid,
    sessionId: state.uid,
    message: input,
    clientTime: formatClientTime(new Date()),
    mood: state.mood,
    heartScore: state.heartScore,
    intimacy: getIntimacyLevel().key,
    recentMessages
  };
}

function formatClientTime(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`;
}

async function callSoulMateApi(input, onDelta) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(SOULMATE_API_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSoulMateApiPayload(input)),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`SoulMate API ${response.status}`);
    }

    if (response.body && typeof response.body.getReader === 'function') {
      return await readSoulMateStream(response, onDelta);
    }

    const data = await response.json();
    if (!data?.ok || !data.reply) throw new Error(data?.error || 'SoulMate API empty reply');
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

async function readSoulMateStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let lastPayload = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const eventName = (lines.find((line) => line.startsWith('event:')) || '').slice(6).trim();
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const payload = JSON.parse(dataLine.slice(5).trim());
      if (eventName === 'delta' && payload.delta) {
        onDelta?.(payload.delta, payload.fullText || '');
      }
      if (eventName === 'done') {
        lastPayload = payload;
      }
    }
  }

  if (!lastPayload?.reply) throw new Error('SoulMate API empty stream');
  return { ok: true, ...lastPayload };
}

function offlineReply(input, phase) {
  const intimacy = getIntimacyLevel();
  const mood = detectMood(input);
  const text = input.toLowerCase();

  if (isChoiceQuestion(text)) {
    return choiceFallbackReply(input);
  }

  if (isPreferenceInput(text)) {
    return preferenceFallbackReply();
  }

  if (isPlanInput(text)) {
    return planFallbackReply(text);
  }

  if (mood === 'angry') {
    return randomFrom([
      '(把脸转开一点点) 哼，你刚刚那句我可记住了。快哄我一下，我就原谅你。',
      '(轻轻戳戳你的手臂) 坏蛋，怎么这样说呀。有一点点小生气，但还是想被你哄。',
      intimacy.min >= 140 ? '(抬眼看着你) 我小小生气了，但你抱紧一点、认真哄我，我就心软。' : '(靠在沙发这边等你) 你要认真一点哄我哦。'
    ]);
  }

  if (text.includes('难受') || text.includes('累') || text.includes('烦') || text.includes('不开心') || text.includes('压力') || text.includes('焦虑')) {
    return randomFrom([
      '(凑过来抱住你) 今天先别逞强，慢慢说给我听，我会陪着你。',
      '(轻轻捏捏你的手) 我听着呢。你不用马上变好，先靠我一会儿，好不好？',
      '(把水杯递到你手边) 辛苦啦宝宝，先深呼吸一下，不会让你一个人扛。',
      intimacy.min >= 220 ? '(从背后抱着你) 过来，今天你不用很坚强，先把烦心事放到我怀里。' : '(拍拍身边的位置) 先靠我一会儿，我陪你把这一阵慢慢熬过去。'
    ]);
  }

  if (mood === 'cute') {
    return randomFrom([
      '(往你怀里蹭一下) 来，大学那会儿你就这样会哄我，现在还是。',
      '(托着下巴看手机) 宝宝我也想贴贴，下班回知春路再陪你说话。',
      '(先把康康抱开) 亲一下可以，但你要乖乖让我多抱三秒。',
      intimacy.min >= 140 ? '(软软地贴过来) 过来贴贴。我今天就想黏你一小会儿，不许躲。' : '(轻轻牵住你) 好呀，抱一下就不许马上跑。'
    ]);
  }

  if (text.includes('夸')) {
    return intimacy.min >= 140
      ? '(凑近一点看着你) 当然要夸呀，你今天已经很努力了，认真起来的样子真的很让我心动。'
      : '(轻轻拍拍你) 当然要夸呀，你今天也有认真生活，已经很棒了。';
  }

  if (text.includes('加班') || text.includes('工作') || text.includes('忙') || text.includes('字节') || text.toLowerCase().includes('seed')) {
    return intimacy.min >= 220
      ? '(把水杯推到你手边) 辛苦啦我的宝，Seed 那边再忙也先喝一口，肩膀放松一点。'
      : '(轻轻按按你的肩) 辛苦啦，忙完这一阵就回知春路这边跟我贴贴。';
  }

  if (text.includes('生日') || text.includes('520')) {
    return '(笑着凑过去) 你还记得我 2000 年 5 月 20 日生日呀，算你有心，亲一下。';
  }

  if (text.includes('康康') || text.includes('猫')) {
    return randomFrom([
      '(把康康抱到旁边) 它刚刚还蹭我腿呢，我认真听你说。',
      '(摸摸康康的脑袋) 它也像在陪你。我们的小家有你和它就很安心。'
    ]);
  }

  if (text.includes('回家') || text.includes('知春路')) {
    return randomFrom([
      '(在门口看了看康康) 那你回知春路这边慢一点，我在家里等你。',
      '(把客厅的小灯打开) 你回来就先坐下，我抱你一会儿。'
    ]);
  }

  return randomFrom(offlineReplies[phase] || offlineReplies.night);
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

function planFallbackReply(text) {
  const scene = getLifeScene(new Date());
  const later = scene.key === 'work' ? '下班后' : '等会儿';
  if (/吃|饭|餐|菜|火锅|烧烤|咖啡|奶茶/.test(text)) {
    return scene.key === 'work'
      ? `(看了眼日程) 好呀，${later}去吃，我现在先乖乖上班。`
      : '(眼睛一亮) 好呀，我想和你一起慢慢吃，不赶时间。';
  }
  if (/看|电影|展|演出|剧|球/.test(text)) {
    return scene.key === 'work'
      ? `(托着下巴看手机) 可以呀，${later}去，我想和你坐一起看。`
      : '(凑近一点) 可以呀，和你坐一起看什么都开心。';
  }
  if (/逛|走|散步|公园|商场|菜市场/.test(text)) {
    return scene.key === 'work'
      ? `(隔着屏幕笑) 好呀，${later}再去慢慢逛。`
      : '(牵住你的手) 好呀，我想跟你慢慢逛一会儿。';
  }
  return scene.key === 'work'
    ? `(看着手机笑) 好呀，${later}再说，我现在先把工作收一下。`
    : '(笑着点点头) 好呀，只要和你一起我就想去。';
}

function preferenceFallbackReply() {
  const scene = getLifeScene(new Date());
  return scene.key === 'work'
    ? '(托着下巴看手机) 我喜欢轻松一点的，下班后和你一起就行。'
    : '(托着下巴想了想) 我喜欢轻松一点的，主要是想和你待在一起。';
}

function choiceFallbackReply(input) {
  const options = parseChoiceOptions(input);
  if (options.length >= 2) {
    const picked = pickChoiceOption(options);
    return `(歪头想了想) 我选${picked}，感觉更适合咱俩今天一起去。`;
  }
  return '(歪头想了想) 我帮你选后面那个吧，感觉会更有新鲜感。';
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

function resolveMood(beforeMood, reply) {
  const replyMood = detectMood(reply);
  if (beforeMood === 'angry' || replyMood === 'angry') return 'angry';
  if (beforeMood === 'cute' || replyMood === 'cute') return 'cute';
  return 'happy';
}

function normalizeReply(reply, input = '') {
  const cleanReply = String(reply)
    .replace(/\s+/g, ' ')
    .replace(/^["“]|["”]$/g, '')
    .trim();
  const normalized = normalizeActionReply(cleanReply);
  if (!isCompleteReply(normalized)) {
    return offlineReply(input, getTimePhase(new Date()));
  }
  return softenLongReply(normalized) || offlineReply(input, getTimePhase(new Date()));
}

function isCompleteReply(reply) {
  const text = String(reply || '').trim();
  if (!text) return false;
  if (/^[（(][^）)]*$/.test(text)) return false;
  if (/^[（(][^）)]*[，,、;；]$/.test(text)) return false;
  if (/[，,、;；：:]$/.test(text)) return false;
  return true;
}

function isLikelyTruncated(reply) {
  const text = String(reply || '').trim();
  if (!isCompleteReply(text)) return true;
  if (/(但是|但|可是|不过|然后|因为|所以|而且|要不|咱们|我们|我想|你先)$/.test(text)) return true;
  if (/[“‘《（(]$/.test(text)) return true;
  return false;
}

function normalizeActionReply(reply) {
  const text = String(reply || '').trim();
  if (!text) return '';

  if (/^（[^）]{2,80}）\s*/.test(text)) {
    return text.replace(/^（([^）]+)）\s*/, '($1) ');
  }
  if (/^\([^)]{2,80}\)\s*/.test(text)) return text;

  const quoteMatch = text.match(/^我?(.{2,80}?)[：:]\s*[“"](.+?)[”"]?$/);
  if (quoteMatch) {
    return `(${cleanActionText(quoteMatch[1])}) ${quoteMatch[2].trim()}`;
  }

  const firstSentenceMatch = text.match(/^我?(.{2,45}?[看抱靠凑摸牵捏递掖揉歪坐挪贴戳])([^。！？]*?)[。！？]\s*(.+)$/);
  if (firstSentenceMatch) {
    return `(${cleanActionText(`${firstSentenceMatch[1]}${firstSentenceMatch[2]}`)}) ${firstSentenceMatch[3].trim()}`;
  }

  return text;
}

function cleanActionText(action) {
  return String(action)
    .replace(/^我/, '')
    .replace(/[“”"':：。！？]+$/g, '')
    .trim();
}

function softenLongReply(reply) {
  const text = String(reply || '').trim();
  const maxLength = 140;
  if (text.length <= maxLength) return text;

  const boundary = Math.max(
    text.lastIndexOf('。', maxLength),
    text.lastIndexOf('！', maxLength),
    text.lastIndexOf('？', maxLength),
    text.lastIndexOf('.', maxLength),
    text.lastIndexOf('!', maxLength),
    text.lastIndexOf('?', maxLength)
  );
  if (boundary > 18) return text.slice(0, boundary + 1);
  return text;
}

function addMessage(role, text) {
  state.messages.push({
    role,
    text,
    time: Date.now()
  });
  state.messages = state.messages.slice(-28);
  persistMessages();
  renderMessages();
  return state.messages.length - 1;
}

function updateMessage(index, text, options = {}) {
  if (!state.messages[index]) return;
  state.messages[index].text = text;
  if (options.persist !== false) {
    persistMessages();
  }
  renderMessages();
}

function renderMessages() {
  els.messages.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.messages.forEach((message) => {
    const row = document.createElement('div');
    row.className = `message ${message.role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = message.text;
    row.appendChild(bubble);
    fragment.appendChild(row);
  });
  els.messages.appendChild(fragment);
  scrollMessagesToBottom();
}

function scrollMessagesToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function settleMessagesAfterLayout() {
  scrollMessagesToBottom();
  requestAnimationFrame(scrollMessagesToBottom);
  window.setTimeout(scrollMessagesToBottom, 120);
  window.setTimeout(scrollMessagesToBottom, 320);
}

function loadState() {
  state.uid = ensureClientUid();
  state.started = localStorage.getItem(STORAGE_KEYS.started) === '1';
  state.musicMuted = localStorage.getItem(STORAGE_KEYS.musicMuted) === '1';
  state.messages = safeJson(localStorage.getItem(STORAGE_KEYS.messages), []);
  const heart = safeJson(localStorage.getItem(STORAGE_KEYS.heart), null);
  if (heart && typeof heart === 'object') {
    state.heartDate = heart.date || '';
    state.heartScore = Number(heart.score) || 0;
  }
  chooseMateImage();
  ensureTodayHeart(new Date());
}

function ensureClientUid() {
  const existing = normalizeUid(localStorage.getItem(STORAGE_KEYS.uid));
  if (existing) return existing;

  const uid = generateUid();
  localStorage.setItem(STORAGE_KEYS.uid, uid);
  return uid;
}

function generateUid() {
  if (window.crypto?.randomUUID) {
    return `u_${window.crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }

  const randomPart = Math.random().toString(36).slice(2, 14);
  const timePart = Date.now().toString(36).slice(-8);
  return normalizeUid(`u_${timePart}${randomPart}`) || 'u_local0000000000000000';
}

function normalizeUid(value) {
  const uid = String(value || '').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{2,31}$/.test(uid) ? uid : '';
}

function persistMessages() {
  const savedMessages = state.messages
    .filter((message) => message.role !== 'system' || message.text !== '她正在回复...')
    .slice(-24);
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(savedMessages));
}

function persistHeart() {
  localStorage.setItem(STORAGE_KEYS.heart, JSON.stringify({
    date: state.heartDate,
    score: state.heartScore
  }));
}

function ensureTodayHeart(date) {
  const today = formatDate(date);
  if (state.heartDate === today && state.heartScore > 0) return;

  const base = 52 + stableDaySeed(today) % 29;
  state.heartDate = today;
  state.heartScore = Math.max(state.heartScore, base);
  persistHeart();
  updateHeartUi();
  setDailySign(today);
}

function setDailySign(today) {
  const saved = safeJson(localStorage.getItem(STORAGE_KEYS.dailySign), null);
  if (saved?.date === today) return;

  const signs = [
    '今日心动签：多喝水，也要多想我。',
    '今日心动签：今天适合抱抱、好好吃饭、摸摸康康。',
    '今日心动签：Seed 再忙，也不许忘了我。',
    '今日心动签：回到知春路这边，把烦心事交给我一半。'
  ];
  const sign = signs[stableDaySeed(today) % signs.length];
  localStorage.setItem(STORAGE_KEYS.dailySign, JSON.stringify({ date: today, sign }));
  if (state.started) addMessage('system', sign);
}

function updateHeartScore(delta) {
  ensureTodayHeart(new Date());
  const before = getIntimacyLevel();
  state.heartScore = Math.min(999, state.heartScore + delta);
  persistHeart();
  updateHeartUi();
  const after = getIntimacyLevel();
  if (state.started && before.key !== after.key) {
    showStageCeremony(after);
    addMessage('system', `关系升温：${after.name} · ${after.tone}，新的亲密互动解锁了。`);
  }
}

function updateHeartUi() {
  const intimacy = getIntimacyLevel();
  els.heartScore.textContent = String(state.heartScore);
  els.intimacyLabel.textContent = `${intimacy.name} · ${intimacy.tone}`;
  document.body.dataset.intimacy = intimacy.key;
  els.moodText.textContent = getMoodText(state.mood, intimacy);
  if (state.lastIntimacyKey !== intimacy.key) {
    state.lastIntimacyKey = intimacy.key;
    renderQuickActions(intimacy);
  }
}

function ensureWelcomeMessage() {
  if (state.messages.length) return;
  const saved = safeJson(localStorage.getItem(STORAGE_KEYS.dailySign), null);
  addMessage('her', `(抱着康康等你) ${getTimeGreeting(new Date())} 今天也想和你待在一起。`);
  if (saved?.sign) addMessage('system', saved.sign);
}

function showTapNote(text) {
  els.tapNote.textContent = text;
  els.tapNote.classList.add('is-visible');
  window.clearTimeout(state.tapNoteTimer);
  state.tapNoteTimer = window.setTimeout(() => {
    els.tapNote.classList.remove('is-visible');
  }, 1800);
}

function showStageCeremony(level) {
  const today = formatDate(new Date());
  const saved = safeJson(localStorage.getItem(STORAGE_KEYS.stageCeremonies), {});
  const shownToday = saved[today] || [];
  const firstTimeToday = !shownToday.includes(level.key);

  if (firstTimeToday) {
    saved[today] = [...shownToday, level.key];
    localStorage.setItem(STORAGE_KEYS.stageCeremonies, JSON.stringify(saved));
  }

  els.stageTitle.textContent = `进入 ${level.name}`;
  els.stageSubtitle.textContent = firstTimeToday ? '她离你更近了一点' : '她又靠近了你一点';
  els.stageCeremony.classList.remove('is-hidden');
  showTapNote(`${level.name} · ${level.tone}`);
  burstHearts(level.key === 'exclusive' ? 16 : 12);

  window.setTimeout(() => {
    els.stageCeremony.classList.add('is-hidden');
  }, 1700);
}

function noteInteraction() {
  resetIdleTimer();
  scheduleProactiveCare();
  if (state.started && !state.musicMuted && els.bgmAudio?.paused) {
    playBgm();
  }
}

function resetIdleTimer() {
  window.clearTimeout(state.idleTimer);
  if (!state.started || document.hidden) return;

  state.idleTimer = window.setTimeout(() => {
    if (state.pending || els.gameScreen.classList.contains('is-hidden')) {
      resetIdleTimer();
      return;
    }

    const moods = ['happy', 'angry', 'cute'];
    const nextMood = randomFrom(moods);
    const intimacy = getIntimacyLevel();
    state.idleCount += 1;
    setMood(nextMood);
    rotateMateImage();
    showTapNote(randomFrom(intimacy.tap[nextMood] || moodCopy[nextMood]));
    if (state.idleCount % 3 === 0) {
      addMessage('system', randomFrom(intimacy.idle));
    }
    resetIdleTimer();
  }, 10000);
}

function scheduleProactiveCare() {
  window.clearTimeout(state.proactiveTimer);
  if (!state.started || document.hidden) return;

  const level = getIntimacyLevel();
  const delay = 45000 + Math.random() * (level.min >= 140 ? 30000 : 45000);
  state.proactiveTimer = window.setTimeout(() => {
    if (
      !state.started ||
      document.hidden ||
      state.pending ||
      els.gameScreen.classList.contains('is-hidden') ||
      els.messageInput.value.trim()
    ) {
      scheduleProactiveCare();
      return;
    }

    if (Date.now() - state.lastProactiveAt < 45000) {
      scheduleProactiveCare();
      return;
    }

    const current = getIntimacyLevel();
    const phase = getTimePhase(new Date());
    const nightHigh = phase === 'night' && current.min >= 140;
    const message = nightHigh
      ? randomFrom(['(把被角掖好) 别熬太晚，我陪你说完这几句就睡。', '(摸摸康康的脑袋) 困了就靠我这边，我陪你安静一会儿。'])
      : randomFrom(current.proactive);

    state.lastProactiveAt = Date.now();
    addMessage('her', message);
    setMood(current.min >= 140 ? 'cute' : 'happy');
    showTapNote(current.min >= 140 ? '我想你了' : '我在呢');
    scheduleProactiveCare();
  }, delay);
}

function burstHearts(forcedCount) {
  const count = forcedCount || (state.mood === 'cute' ? 7 : 4);
  for (let i = 0; i < count; i += 1) {
    const heart = document.createElement('span');
    heart.textContent = ['♡', '♥', '✦'][i % 3];
    heart.style.cssText = `
      position: fixed;
      left: ${28 + Math.random() * 44}%;
      top: ${38 + Math.random() * 18}%;
      z-index: 4;
      color: var(--heart);
      font-size: ${14 + Math.random() * 12}px;
      pointer-events: none;
      opacity: 0.9;
      transform: translate3d(0,0,0);
      transition: transform 980ms ease, opacity 980ms ease;
      text-shadow: 0 2px 12px rgba(255,255,255,0.72);
    `;
    document.body.appendChild(heart);
    requestAnimationFrame(() => {
      heart.style.transform = `translate3d(${(Math.random() - 0.5) * 90}px, ${-70 - Math.random() * 60}px, 0) scale(1.2)`;
      heart.style.opacity = '0';
    });
    window.setTimeout(() => heart.remove(), 1050);
  }
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function stableDaySeed(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pad(value) {
  return String(value).padStart(2, '0');
}
