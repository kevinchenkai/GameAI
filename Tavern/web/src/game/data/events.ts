import type { TableEventConfig } from "../types";

export const TABLE_EVENTS: TableEventConfig[] = [
  {
    id: "guojing_huangrong_food",
    name: "大漠金牌饲养员",
    npcIds: ["guojing", "huangrong"],
    priority: 100,
    preferredTableId: "A",
    description: "黄蓉疯狂夹菜，郭靖憨笑吃饭。",
    visualEffectKey: "event-food-stack",
    promptContext: "郭靖和黄蓉同桌，话题围绕账单、私房钱、蓉儿说得对。"
  },
  {
    id: "yangguo_xiaolongnv_love",
    name: "古墓派秀恩爱现场",
    npcIds: ["yangguo", "xiaolongnv"],
    priority: 90,
    preferredTableId: "B",
    description: "杨过守着重剑，小龙女淡定喝茶，周围飘着花瓣。",
    visualEffectKey: "event-love-petals",
    promptContext: "杨过与小龙女同桌，旁人容易被他们当成空气。"
  },
  {
    id: "zhangwuji_zhouzhiruo_ptsd",
    name: "婚礼现场 PTSD",
    npcIds: ["zhangwuji", "zhouzhiruo"],
    priority: 80,
    preferredTableId: "D",
    description: "张无忌头顶问号，周芷若安静擦拭倚天剑。",
    visualEffectKey: "event-sword-shadow",
    promptContext: "张无忌与周芷若同桌，空气里充满选择困难和温柔压迫。"
  },
  {
    id: "linghuchong_lanfenghuang_cocktail",
    name: "五仙教鸡尾酒",
    npcIds: ["linghuchong", "lanfenghuang"],
    priority: 70,
    preferredTableId: "C",
    description: "桌上有五毒酒、气泡杯和吐泡泡的小蛇。",
    visualEffectKey: "event-poison-cocktail",
    promptContext: "令狐冲和蓝凤凰拼酒，调饮越怪越像江湖友情。"
  },
  {
    id: "qiaofeng_azi_guard",
    name: "大哥罩着你",
    npcIds: ["qiaofeng", "azi"],
    priority: 60,
    preferredTableId: "C",
    description: "乔峰豪饮，阿紫偷偷递出彩色饮料。",
    visualEffectKey: "event-bgm-wave",
    promptContext: "乔峰护着阿紫，阿紫却总在酒里搞恶作剧。"
  },
  {
    id: "hongqigong_huangrong_food_review",
    name: "叫花鸡审判",
    npcIds: ["hongqigong", "huangrong"],
    priority: 50,
    preferredTableId: "A",
    description: "洪七公认真品评叫花鸡，黄蓉算盘响得飞快。",
    visualEffectKey: "event-food-stack",
    promptContext: "洪七公点评黄蓉菜品，最终总会谈到账单和火候。"
  }
];
