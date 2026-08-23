export interface HowToPlaySection {
  readonly title: string;
  readonly body: string;
}

export interface HowToPlayPage {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: readonly HowToPlaySection[];
}

export const HOW_TO_PLAY_PAGES: readonly HowToPlayPage[] = [
  {
    title: '基本玩法',
    subtitle: '清空卡牌，也清空暂存槽',
    sections: [
      {
        title: '1  点击每列最下方露出的卡牌',
        body: '卡列向下叠放，只能点击画面中每列最下方、完整露出的那张。取走后，被它挡住的上一张才会变为可选。',
      },
      {
        title: '2  卡牌进入暂存槽',
        body: '选中的卡牌会跳进下方 7 格暂存槽，并自动与同类靠在一起，方便观察数量。',
      },
      {
        title: '3  三张同类自动消除',
        body: '暂存槽中任意图案集齐 3 张会立即消除并腾出位置。清空所有列且暂存槽为空即可过关。',
      },
    ],
  },
  {
    title: '槽位与策略',
    subtitle: '给下一组三消留下空间',
    sections: [
      {
        title: '注意 6/7 预警',
        body: '暂存槽占到 6 格时会进入预警态。若 7 格全部填满且没有三张同类可消除，本局立即失败。',
      },
      {
        title: '优先完成已有对子',
        body: '先观察槽里已有的图案，再从各列寻找第三张；不要同时铺开太多不同图案，否则很快会挤满。',
      },
      {
        title: '观察新露出的卡牌',
        body: '一次选择不仅拿走当前卡牌，也会改变下一步的可选项。需要时可以先暂存一张，为下层目标让路。',
      },
    ],
  },
  {
    title: '撤回与打乱',
    subtitle: '卡住时使用工具',
    sections: [
      {
        title: '撤回：不限次数',
        body: '撤回会恢复上一次合法操作前的列、暂存槽和随机状态。刷新后仍保留最近 5 步可撤回记录。',
      },
      {
        title: '打乱：每关 3 次',
        body: '打乱只重新排列剩余列，暂存槽和每列高度不变；系统会校验新局面仍然可继续游玩。',
      },
      {
        title: '工具会影响星级',
        body: '撤回与打乱可以放心救场，但使用次数会影响本次通关星级。重新开始会恢复本关初始布局。',
      },
    ],
  },
  {
    title: '星级与进度',
    subtitle: '轻松过关，随时继续',
    sections: [
      {
        title: '通关星级',
        body: '3 星：撤回和打乱都未使用。\n2 星：两种工具合计使用 1～2 次。\n1 星：成功过关。重复挑战会保留最好成绩。',
      },
      {
        title: '解锁与自动存档',
        body: '通关后自动解锁下一关。每次合法操作都会保存当前局面；刷新页面后可从首页继续游戏。',
      },
      {
        title: '声音与震动',
        body: '在设置中可分别开关音乐、音效和震动，也能重新开始当前关或返回首页。',
      },
    ],
  },
] as const;
