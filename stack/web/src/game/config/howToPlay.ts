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
        title: '只点每列最下方',
        body: '完整露出的最下方卡牌可点；取走后，上面一张会落到底线并变亮。',
      },
      {
        title: '进入 7 格暂存槽',
        body: '选中的卡牌会进入下方暂存槽，并自动与同类靠在一起。',
      },
      {
        title: '三张同类自动消除',
        body: '任意图案集齐 3 张会立即消除。清空所有卡牌即可过关。',
      },
    ],
  },
  {
    title: '槽位与策略',
    subtitle: '给下一组三消留下空间',
    sections: [
      {
        title: '注意 6/7 预警',
        body: '暂存槽到 6 格会预警；7 格填满且没有三张同类可消除，本局失败。',
      },
      {
        title: '优先完成已有对子',
        body: '先看槽里已有的图案，再寻找第三张；不要同时铺开太多不同图案。',
      },
      {
        title: '观察新露出的卡牌',
        body: '一次选择也会露出下一张牌。需要时先暂存一张，为下层目标让路。',
      },
    ],
  },
  {
    title: '撤回与打乱',
    subtitle: '卡住时使用工具',
    sections: [
      {
        title: '撤回：不限次数',
        body: '恢复上一步的列和暂存槽；刷新页面后仍保留最近 5 步记录。',
      },
      {
        title: '打乱：每关 3 次',
        body: '只重新排列剩余牌，暂存槽和每列高度不变，并保证仍可继续。',
      },
      {
        title: '工具会影响星级',
        body: '工具可以救场，但使用次数会影响星级；重来会恢复本关初始布局。',
      },
    ],
  },
  {
    title: '星级与进度',
    subtitle: '轻松过关，随时继续',
    sections: [
      {
        title: '通关星级',
        body: '3 星：未用工具。2 星：工具共用 1～2 次。1 星：成功过关。会保留最好成绩。',
      },
      {
        title: '解锁与自动存档',
        body: '通关后解锁下一关。每次操作都会自动存档，刷新后可从首页继续。',
      },
      {
        title: '声音与震动',
        body: '设置中可分别开关音乐、音效和震动，也能重来或返回首页。',
      },
    ],
  },
] as const;
