#!/usr/bin/env python3
"""生成 index.html。prompt 一律从 prompts/*.txt **原样读入**，不手打、不改写。"""
import html, json, pathlib, subprocess, re

ROOT = pathlib.Path(__file__).parent

# (id, 标题, prompt文件, 模式, 分辨率, 帧数, 时长, 结论, 结论级别, 看点)
CASES = [
    ("H3-001", "太空舰长 Space Captain", "H3-001-space-captain.txt", "T2VA",
     "1344×768", 243, "10.125s", "复现成功", "ok",
     "官方基准案例。两镜结构 + 舰队跃迁白光爆发 + 摄影机剧烈震动，音频随事件由环境 hum 推到爆发后骤然安静。"),
    ("H3-002", "拉面变焦 Ramen Focus Pull", "H3-002-ramen-focus-pull.txt", "I2VA",
     "1344×768", 192, "8.000s", "复现成功", "ok",
     "官方标注 FL2VA，实际条件里只有一张首帧图，等价于 I2VA。摄影机全程静止，靠焦点位移叙事。"),
    ("H3-003", "羊羔与人声 Lamb + Voice", "H3-003-lamb-voice.txt", "Ref2VA",
     "1344×768", 124, "5.167s", "复现成功", "ok",
     "参考视频 + 独立音色参考同时接入。身份保持完整（金发、粉西装、怀里黑羊），并新增对白且口型同步。"),
    ("C-001", "咖啡漩涡 → 沙漠", "C-001-coffee.txt", "FL2VA",
     "1344×768", 243, "10.125s", "复现成功", "ok",
     "首尾帧驱动的形变转场。prompt 明令禁止硬切与黑场，成片实测转场处最大帧差仅为中位数的 3.3 倍（真实切镜为 40.6 倍），确认连续。"),
    ("C-002", "希区柯克变焦", "C-002-hitchcock.txt", "Ref2VA",
     "1344×768", 124, "5.167s", "部分成功", "warn",
     "参考图的人物身份未迁移：参考为咖啡馆卷发年轻女性，成片为戴礼帽的年长男性。变焦一项自动判据失败，如实记为无法判定。"),
    ("C-003", "武侠竹林夜戏", "C-003-wuxia.txt", "T2VA",
     "1344×768", 192, "8.000s", "复现成功", "ok",
     "冷调实测 B−R=+24.42（暖调对照为 −38.06），暗部占比 40.5%，前景虚化竹叶、正反打分镜、飘雪与远处雾光全部命中。"),
    ("C-004", "竖屏吸血鬼短剧", "C-004-vampire.txt", "Ref2VA",
     "768×1344", 362, "15.083s", "部分成功", "warn",
     "唯一竖屏案例，也是帧数上限 362。画面本身稳定无崩坏，但身份未迁移（参考为白人卷发，成片为东亚背头），尾段出现乱码字幕，语音也不可辨识为任何语言。"),
    ("C-005", "仙侠分镜控制", "C-005-xianxia.txt", "Ref2VA",
     "1344×768", 192, "8.000s", "部分成功", "warn",
     "分镜语言迁移成功（远景背身不露脸、近景才给正脸）。但参考图只锁住了外观——"
     "银冠、靛蓝发带、层叠汉服、深蓝腰封等 prompt 点名的属性几乎全中，人物本身却从男变成了女。"
     "已补跑 seed=1 复核，同样未迁移，不是单次抽样波动。"),
    ("C-006", "第一人称射击", "C-006-fps.txt", "Ref2VA",
     "1344×768", 192, "8.000s", "复现成功", "ok",
     "手持感实测最强：持续晃动帧比 0.812 为全集最高，平滑后左右换向 15 次。后坐力一项未观察到，如实标注不计入通过。"),
    ("C-007", "双圆望远镜遮罩", "C-007-binocular.txt", "Ref2VA",
     "1344×768", 243, "10.125s", "复现成功", "ok",
     "prompt 要求双圆遮罩全程绝对固定、只有筒内画面可动。实测质心漂移 Δcx 0.0038 / Δcy 0.0041，遮罩确实钉死。"),
    ("C-008", "六素材节奏迁移", "C-008-sixasset.txt", "Ref2VA",
     "1344×768", 192, "8.000s", "部分成功", "warn",
     "六张素材图都用上了，但参考视频的剪辑节奏没有迁移：成片 2 个切点 vs 参考 5 个，切镜密度低了 79.6%。"),
    # ── D 系列：同作者同模板的结构化长 prompt，各跑双 seed，交付版择优 ──
    ("D-003", "那不勒斯阳台 · 两次硬切", "D-003-signed-on-tuesday.txt", "T2VA",
     "1344×768", 362, "15.083s", "部分成功", "warn",
     "原文声明三段两切。交付版（seed=1）实测正好 2 个切点，分段结构与原文一致；"
     "机位、眼神光、栏杆上两只咖啡杯等可核对的条款均命中。"
     "但另一个 seed（seed=0）实测 3 个切点，且两个 seed 的切点位置几乎不重合 —— "
     "说明 H3 对「切几次、在哪切」并不稳定复现，这条是本系列最重要的负面结论。"),
    ("D-004", "诺曼底地图室 · 硬切 + 反打", "D-004-take-the-lane.txt", "T2VA",
     "1344×768", 362, "15.083s", "复现成功", "ok",
     "两个 seed 都实测 2 个切点，与原文声明一致 —— 是本系列唯一切镜数双 seed 复现的案例。"
     "交付版取 seed=0：油灯作为动机光真的在照亮地图与人脸，曝光全程守得住；"
     "另一 seed 后段接近全暗、人物几乎融进背景。注意切点位置仍不重合。"),
]

# 每个案例的 prompt 出处（复现记录 h3-oss-REPRODUCTION-LOG.md 里的「来源」行）。
# 🔴 只写**真正取到原文的那一个**地址，不要为了页面好看凑链接：
#    C-001/C-002 的原文取自 gallery，gallery 又溯源到官方 guide / 官方 X，
#    这种情况写 gallery（原文实际来源），官方出处放在 note 或引用区。
SOURCES = {
    "H3-001": ("官方可复现脚本 reproducible-768p-t2va-request.sh",
               "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/scripts/readme/reproducible-768p-t2va-request.sh"),
    "H3-002": ("官方可复现脚本 reproducible-768p-fl2va-request.sh",
               "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/scripts/readme/reproducible-768p-fl2va-request.sh"),
    "H3-003": ("官方可复现脚本 reproducible-768p-ref2va-request.sh",
               "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/scripts/readme/reproducible-768p-ref2va-request.sh"),
}
# C-001 ~ C-008 的逐字原文全部取自同一个社区 gallery。
for _cid in ("C-001", "C-002", "C-003", "C-004", "C-005", "C-006", "C-007", "C-008"):
    SOURCES[_cid] = ("社区 gallery forgewebO1/awesome-minimax-h3-prompts",
                     "https://github.com/forgewebO1/awesome-minimax-h3-prompts")
# D 系列取自另一个仓库（ecomimagelab 转录自作者 Alex Patrascu 的 X thread）。
# 🔴 仍按老规矩：写**原文实际取自哪里**（转录仓库），不写"谁最早发的"（作者 X）——
#    我们核对过的是转录后的文本，没有逐字核对过原推。
for _cid in ("D-001", "D-002", "D-003", "D-004"):
    SOURCES[_cid] = ("社区仓库 ecomimagelab/awesome-minimax-h3-prompts（转录自作者 X thread）",
                     "https://github.com/ecomimagelab/awesome-minimax-h3-prompts")


def sha12(p):
    import hashlib
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]

items = []
for cid, title, pf, mode, res, frames, dur, verdict, level, note in CASES:
    pp = ROOT / "prompts" / pf
    text = pp.read_text(encoding="utf-8")
    src_label, src_url = SOURCES[cid]
    items.append({
        "id": cid, "title": title, "mode": mode, "res": res,
        "frames": frames, "dur": dur, "verdict": verdict, "level": level,
        "note": note, "prompt": text.strip(), "sha": sha12(pp),
        "chars": len(text.strip()),
        "vertical": res.startswith("768×"),
        "src_label": src_label, "src_url": src_url,
    })

(ROOT / "cases.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"cases.json 写出 {len(items)} 条")
for i in items:
    print(f"  {i['id']:8s} {i['mode']:7s} {i['chars']:5d} chars sha {i['sha']}")
