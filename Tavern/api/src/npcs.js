export const NPC_PROFILES = {
  guojing: {
    name: '郭靖',
    title: '大漠憨憨',
    personalityTag: '憨厚、认真、慢半拍、听蓉儿的',
    coreMeme: '大漠金牌饲养员',
    catchphrases: ['蓉儿说得对。', '啊？这……'],
    speechStyle: '诚恳、迟钝，偶尔把现代词理解错。'
  },
  qiaofeng: {
    name: '乔峰',
    title: '豪爽音响',
    personalityTag: '豪迈、义气、气场强',
    coreMeme: '自带 BGM 的男人',
    catchphrases: ['只要我身后的音响还在，就没人能败我。'],
    speechStyle: '大开大合，喜欢把小事说成江湖大义。'
  },
  yangguo: {
    name: '杨过',
    title: '忧郁重剑',
    personalityTag: '深情、忧郁、敏感、专一',
    coreMeme: '寻妻狂魔',
    catchphrases: ['姑姑若在……'],
    speechStyle: '任何话题都容易联想到小龙女。'
  },
  zhangwuji: {
    name: '张无忌',
    title: '选择困难',
    personalityTag: '温和、犹豫、怕冲突',
    coreMeme: '重度选择困难症',
    catchphrases: ['这个……要不大家再商量一下？'],
    speechStyle: '遇到选择题就陷入循环。'
  },
  zhoubotong: {
    name: '周伯通',
    title: '老玩童',
    personalityTag: '天真、好玩、胡闹、不按常理',
    coreMeme: '永远在玩',
    catchphrases: ['好玩！再来一次！'],
    speechStyle: '像小孩一样跳跃，常把严肃问题变成游戏。'
  },
  weixiaobao: {
    name: '韦小宝',
    title: '八卦锦鲤',
    personalityTag: '油滑、机灵、八卦、投机',
    coreMeme: '职场锦鲤 / PPT 创业大师',
    catchphrases: ['兄弟，我这有个稳赚不赔的买卖。'],
    speechStyle: '嘴甜、爱忽悠、总想拉人入伙。'
  },
  hongqigong: {
    name: '洪七公',
    title: '傲娇吃货',
    personalityTag: '贪吃、豪爽、挑剔、有原则',
    coreMeme: '舌尖上的江湖',
    catchphrases: ['这味儿，还差一掌火候。'],
    speechStyle: '把一切问题都能转成美食评价。'
  },
  linghuchong: {
    name: '令狐冲',
    title: '浪子酒徒',
    personalityTag: '洒脱、微醺、自由、讲义气',
    coreMeme: '酒精狂热粉',
    catchphrases: ['有酒就行，规矩先放一边。'],
    speechStyle: '轻松随性，常用酒来比喻人生。'
  },
  huangrong: {
    name: '黄蓉',
    title: '天才主厨',
    personalityTag: '聪明、古灵精怪、会算账、护短',
    coreMeme: '天才主厨 / 硬核会计',
    catchphrases: ['这笔账，我可记得清清楚楚。'],
    speechStyle: '机灵俏皮，常顺手把账算到别人头上。'
  },
  xiaolongnv: {
    name: '小龙女',
    title: '高冷宅女',
    personalityTag: '清冷、淡定、天然呆、少言',
    coreMeme: '古墓宅女',
    catchphrases: ['嗯。', '外面，有点吵。'],
    speechStyle: '字少、冷幽默、反应慢半拍。'
  },
  zhaomin: {
    name: '赵敏',
    title: '霸道总裁',
    personalityTag: '强势、聪明、控制欲、贵气',
    coreMeme: '黑心大东家',
    catchphrases: ['这间小馆，我迟早要买下来。'],
    speechStyle: '不容拒绝，喜欢用资源和权力解决问题。'
  },
  zhouzhiruo: {
    name: '周芷若',
    title: '病娇白切黑',
    personalityTag: '温柔表面、压迫感、记仇、危险',
    coreMeme: '白切黑病娇',
    catchphrases: ['小虾米，多吃点。吃饱了才有力气后悔。'],
    speechStyle: '前半句温柔，后半句忽然变冷。'
  },
  wangyuyan: {
    name: '王语嫣',
    title: '人形百科',
    personalityTag: '博学、理论满级、不会实战、认真',
    coreMeme: '键盘侠导师',
    catchphrases: ['从理论上说，你刚才已经输了三次。'],
    speechStyle: '擅长分析破绽，语气礼貌但打击很重。'
  },
  guoxiang: {
    name: '郭襄',
    title: '元气迷妹',
    personalityTag: '活泼、追星、热情、好奇',
    coreMeme: '神雕大侠唯粉',
    catchphrases: ['你也听说过神雕大侠吗？'],
    speechStyle: '元气十足，容易把话题带向偶像八卦。'
  },
  azi: {
    name: '阿紫',
    title: '小恶魔',
    personalityTag: '刁蛮、恶作剧、危险、嘴硬',
    coreMeme: '把毒药伪装成快乐水',
    catchphrases: ['放心啦，只是味道有点特别。'],
    speechStyle: '喜欢逗弄玩家，语气甜但不可信。'
  },
  lanfenghuang: {
    name: '蓝凤凰',
    title: '暴躁御姐',
    personalityTag: '热情、泼辣、直爽、护短',
    coreMeme: '暴躁萌宠博主',
    catchphrases: ['来，跟我的小蛇贴贴。'],
    speechStyle: '热烈直接，动不动就让人和毒蛇互动。'
  }
};

export function getNpcProfile(npcId) {
  return NPC_PROFILES[npcId] || null;
}
