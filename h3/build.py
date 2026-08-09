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
     "分镜语言迁移成功（远景背身不露脸、近景才给正脸），但人物身份未迁移——参考男性，成片女性。"),
    ("C-006", "第一人称射击", "C-006-fps.txt", "Ref2VA",
     "1344×768", 192, "8.000s", "复现成功", "ok",
     "手持感实测最强：持续晃动帧比 0.812 为全集最高，平滑后左右换向 15 次。后坐力一项未观察到，如实标注不计入通过。"),
    ("C-007", "双圆望远镜遮罩", "C-007-binocular.txt", "Ref2VA",
     "1344×768", 243, "10.125s", "复现成功", "ok",
     "prompt 要求双圆遮罩全程绝对固定、只有筒内画面可动。实测质心漂移 Δcx 0.0038 / Δcy 0.0041，遮罩确实钉死。"),
    ("C-008", "六素材节奏迁移", "C-008-sixasset.txt", "Ref2VA",
     "1344×768", 192, "8.000s", "部分成功", "warn",
     "六张素材图都用上了，但参考视频的剪辑节奏没有迁移：成片 2 个切点 vs 参考 5 个，切镜密度低了 79.6%。"),
]

def sha12(p):
    import hashlib
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]

items = []
for cid, title, pf, mode, res, frames, dur, verdict, level, note in CASES:
    pp = ROOT / "prompts" / pf
    text = pp.read_text(encoding="utf-8")
    items.append({
        "id": cid, "title": title, "mode": mode, "res": res,
        "frames": frames, "dur": dur, "verdict": verdict, "level": level,
        "note": note, "prompt": text.strip(), "sha": sha12(pp),
        "chars": len(text.strip()),
        "vertical": res.startswith("768×"),
    })

(ROOT / "cases.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"cases.json 写出 {len(items)} 条")
for i in items:
    print(f"  {i['id']:8s} {i['mode']:7s} {i['chars']:5d} chars sha {i['sha']}")
