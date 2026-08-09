#!/usr/bin/env python3
"""
check-overlays.py —— 特殊棋子叠加层交付验收（工单 codex-redo-batch5-overlays-style.md §4/§5）

用法：
    python3 tools/check-overlays.py                     # 验收正式路径
    python3 tools/check-overlays.py --dir <候选目录>      # 验收候选图
    python3 tools/check-overlays.py --preview out.png    # 另存六色合成总览

★★ 判据来自 LEGIBILITY-SPEC §5.2，与 §5.1（冰块/遮挡层）**方向相反**：
   遮挡层怕盖死棋子，标记层怕自己看不见。
   batch4 首版就是套错了规则 —— 每个数字都达标，但香蕉上 Δ=5.7，等于没有标记。

★ 亮度一律 BT.709（0.2126/0.7152/0.0722）。
   本项目全程用 709；我曾错用 BT.601 得出 17.0 判为不合格，
   709 实际是 25.2 —— 全部通过，白发了一张返工单。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PIECES = ROOT / "web" / "public" / "assets" / "pieces"

OVERLAYS = ["overlay-rocket-h", "overlay-rocket-v", "overlay-bomb"]
COLORS = ["red", "yellow", "green", "blue", "purple", "orange"]

# —— 工单硬判据 ——
MIN_DELTA = 20.0          # §4.2 标记与其下棋子的灰度差，六色全部满足
MAX_AREA = {"overlay-rocket-h": 12.0, "overlay-rocket-v": 12.0, "overlay-bomb": 25.0}  # §4.1
# §3.1 风格：明暗跨度要收进水果区间。水果实测 37.7~50.8，放宽到 90 作为上限。
# 旧版实测 210~233，是水果的 4~6 倍 —— 这正是"难看"的技术根源。
MAX_SPAN = 90.0
ALPHA_MIN = 8             # 低于此视为透明，不计入统计

# —— 第 6 批新增判据 ——
#
# ★★ 为什么加这两条：redo5 交付**全部数字达标却更难看**。
#
#   Codex 把跨度从 230 压到 50，但压的方式是**把亮芯砍掉**
#   （芯部 P95 从 221~241 掉到 135~137），而不是把明暗过渡做柔。
#   结果标记平均色 (172,98,28) 和橙子 (222,113,34) 撞成同一族褐色，
#   芯色到橙子的色距从 107 腰斩到 51 —— 亮度和色相两条路同时堵死。
#
#   原判据放行了它：Δ 只看亮度差，MAX_SPAN 只看跨度，
#   两者都没防住"整体降亮 + 撞色"。所以补两条。
MIN_CORE_LUM = 190.0      # 芯部 P95 亮度下限：压跨度只能靠柔化过渡，不许降亮芯
#
# ★★ 色距**不能单独当硬判据** —— 这一条我差点写错，实测挡住了。
#
#   旧版（可读性公认合格）在香蕉上色距只有 20.2~37.0：金芯和香蕉几乎同色。
#   但它在香蕉上明明清清楚楚，因为**亮度差高达 132**，靠亮度赢的。
#   反过来 redo5 在橙子上色距 41、亮度差也只有 43 —— 两条都不占，才糊。
#
#   所以正确的规则是「**亮度或色相，至少赢一样；不许两样都输**」，
#   而不是两条都要满足（那会把公认合格的旧版一起毙掉）。
MIN_CORE_DIST = 90.0      # 色距达标线：达到即可豁免亮度差要求
STRONG_DELTA = 60.0       # 亮度差达标线：达到即可豁免色距要求

BT709 = np.array([0.2126, 0.7152, 0.0722])


def luma(rgb: np.ndarray) -> np.ndarray:
    """BT.709 亮度。rgb 形如 (..., 3)，值域 0~255。"""
    return rgb.astype(float) @ BT709


def load(path: Path) -> np.ndarray:
    """读成 (H, W, 4) float 数组。"""
    return np.asarray(Image.open(path).convert("RGBA")).astype(float)


def delta(comp: np.ndarray, piece: np.ndarray, m: np.ndarray, ref_mask: np.ndarray) -> float:
    """
    标记相对棋子的可见度。

    ★★ 判据必须是"标记里**最亮的部分**比棋子亮多少"，**不能用整块均值**。

      ⚠️ 我第一版用的是均值差，结果紫葡萄上量出 Δ=1.2，判为"完全看不见" ——
      但合成图里金色箭头明明清清楚楚。原因是标记由**深棕描边 + 亮金芯**
      两部分组成：一暗一亮，平均下来正好落在紫色的中间。
      **两张完全不同的图可以有相同的均值**，均值差量的不是"看不看得见"。

      真正决定可读性的是**芯部与背景的对比**（描边只是保证边界不糊）。
      所以取标记区亮度的 P90（芯），与棋子参照区的中位数比。
      双向取 max，是因为深色标记压在浅色棋子上同样合法（对付香蕉那种情况）。
    """
    lm = luma(comp[..., :3][m])
    lp = luma(piece[..., :3][ref_mask])
    base = float(np.median(lp))
    bright = float(np.percentile(lm, 90)) - base   # 亮芯对背景
    dark = base - float(np.percentile(lm, 10))     # 暗芯对背景
    return max(bright, dark)


def core_color(ov: np.ndarray) -> tuple[np.ndarray, float]:
    """
    标记"芯部"的平均色与亮度 P95。

    ★ 芯 = 实心区（alpha>200）里最亮的 20%。描边不算芯 ——
      判据要防的是"整体降亮变浑"，而描边本来就该是暗的。
    """
    m = ov[..., 3] > 200
    if not m.any():
        m = ov[..., 3] > ALPHA_MIN
    rgb = ov[..., :3][m]
    lum = luma(rgb)
    p95 = float(np.percentile(lum, 95))
    core = rgb[lum >= np.percentile(lum, 80)]
    return core.mean(axis=0), p95


def alpha_composite(base: np.ndarray, over: np.ndarray) -> np.ndarray:
    """标记叠到棋子上（over 在上）。返回 (H, W, 4)。"""
    ba, oa = base[..., 3:4] / 255.0, over[..., 3:4] / 255.0
    out_a = oa + ba * (1 - oa)
    safe = np.where(out_a > 0, out_a, 1.0)
    rgb = (over[..., :3] * oa + base[..., :3] * ba * (1 - oa)) / safe
    return np.concatenate([rgb, out_a * 255.0], axis=-1)


def check_one(ov_path: Path, piece_dir: Path) -> tuple[list[str], list[str]]:
    """返回 (失败信息, 提示信息)。"""
    fails: list[str] = []
    notes: list[str] = []
    name = ov_path.stem
    ov = load(ov_path)

    if ov.shape[0] != 256 or ov.shape[1] != 256:
        fails.append(f"{name}: 尺寸 {ov.shape[1]}x{ov.shape[0]}，工单要求 256x256")

    mask = ov[..., 3] > ALPHA_MIN
    if not mask.any():
        fails.append(f"{name}: 整张透明，无内容")
        return fails, notes

    # §3.1 明暗跨度 —— 与水果同一套语言
    lum = luma(ov[..., :3][mask])
    span = float(np.percentile(lum, 95) - np.percentile(lum, 5))
    tag = "OK" if span <= MAX_SPAN else "过硬"
    notes.append(f"  明暗跨度 P95-P05 = {span:6.1f}   (水果 37.7~50.8，上限 {MAX_SPAN:.0f}) [{tag}]")
    if span > MAX_SPAN:
        fails.append(
            f"{name}: 明暗跨度 {span:.1f} > {MAX_SPAN:.0f} —— 对比仍过硬，"
            f"与水果不是同一套画风（这是本次重做的核心目标）"
        )

    # §4.1 面积
    area = float(mask.sum()) / mask.size * 100.0
    cap = MAX_AREA[name]
    notes.append(f"  覆盖面积       = {area:6.1f}%  (上限 {cap:.0f}%)")
    if area > cap:
        fails.append(f"{name}: 覆盖 {area:.1f}% > {cap:.0f}%，开始盖住水果本体")

    # 芯部亮度 —— 压跨度不许靠降亮芯
    core, core_p95 = core_color(ov)
    notes.append(
        f"  芯部亮度 P95   = {core_p95:6.1f}   (下限 {MIN_CORE_LUM:.0f}；旧版 221~241)"
    )
    if core_p95 < MIN_CORE_LUM:
        fails.append(
            f"{name}: 芯部 P95={core_p95:.1f} < {MIN_CORE_LUM:.0f} —— "
            f"跨度是靠**砍掉亮芯**压下来的，不是靠柔化过渡。标记会发闷发浑"
        )
    notes.append(f"  芯部平均色     = ({core[0]:.0f}, {core[1]:.0f}, {core[2]:.0f})")

    # §4.2 六色可见性：亮度差 Δ 与芯色距，**至少赢一样**
    notes.append(
        f"  六色可见性（Δ=亮度差 / D=芯色距；需 Δ>={MIN_DELTA:.0f} 且"
        f"「Δ>={STRONG_DELTA:.0f} 或 D>={MIN_CORE_DIST:.0f}」）："
    )
    for c in COLORS:
        pf = piece_dir / f"piece-{c}.png"
        if not pf.exists():
            notes.append(f"    {c:<7} 棋子缺失，跳过")
            continue
        piece = load(pf)
        if piece.shape[:2] != ov.shape[:2]:
            piece = np.asarray(
                Image.open(pf).convert("RGBA").resize((ov.shape[1], ov.shape[0]), Image.LANCZOS)
            ).astype(float)

        comp = alpha_composite(piece, ov)
        # 标记区 = 标记不透明处；参照 = 棋子上没被标记盖住的部分
        piece_vis = piece[..., 3] > ALPHA_MIN
        ref_mask = piece_vis & ~mask
        m = mask & piece_vis
        if not m.any() or not ref_mask.any():
            notes.append(f"    {c:<7} 无重叠区，跳过")
            continue

        d = delta(comp, piece, m, ref_mask)
        pm = piece[..., 3] > 200
        dist = float(np.linalg.norm(core - piece[..., :3][pm].mean(axis=0))) if pm.any() else 999.0

        # 亮度或色相，至少赢一样；两样都输才是真糊
        wins = d >= STRONG_DELTA or dist >= MIN_CORE_DIST
        ok = d >= MIN_DELTA and wins
        hint = "  (最浅，历史失败点)" if c == "yellow" else ""
        why = "" if ok else ("  <-- 亮度与色相双输，糊在一起" if d >= MIN_DELTA else "  <-- 看不见")
        notes.append(
            f"    {c:<7} Δ = {d:6.1f}  D = {dist:6.1f}   {'OK' if ok else '不合格'}{hint}{why}"
        )
        if d < MIN_DELTA:
            fails.append(f"{name} on {c}: Δ={d:.1f} < {MIN_DELTA:.0f}，标记在这个颜色上看不见")
        elif not wins:
            fails.append(
                f"{name} on {c}: Δ={d:.1f}(<{STRONG_DELTA:.0f}) 且芯色距={dist:.1f}"
                f"(<{MIN_CORE_DIST:.0f}) —— 亮度不够亮、颜色又撞，标记糊进棋子里"
            )

    return fails, notes


def build_preview(piece_dir: Path, ov_dir: Path, out: Path) -> None:
    """六色 x 三标记合成总览 + 40px 缩略行（工单 §5 要求的验收图）。"""
    cell, pad, thumb = 128, 8, 40
    rows, cols = len(OVERLAYS), len(COLORS)
    h = rows * (cell + pad) + pad + thumb + pad
    w = cols * (cell + pad) + pad
    canvas = Image.new("RGBA", (w, h), (60, 46, 38, 255))  # 深色底，验描边

    for r, ovn in enumerate(OVERLAYS):
        ovp = ov_dir / f"{ovn}.png"
        if not ovp.exists():
            continue
        ov = load(ovp)
        for c, col in enumerate(COLORS):
            pf = piece_dir / f"piece-{col}.png"
            if not pf.exists():
                continue
            piece = np.asarray(
                Image.open(pf).convert("RGBA").resize((ov.shape[1], ov.shape[0]), Image.LANCZOS)
            ).astype(float)
            comp = alpha_composite(piece, ov)
            img = Image.fromarray(comp.clip(0, 255).astype("uint8"), "RGBA").resize(
                (cell, cell), Image.LANCZOS
            )
            canvas.alpha_composite(img, (pad + c * (cell + pad), pad + r * (cell + pad)))

    # 40px 行：手机上标记的真实大小
    y = pad + rows * (cell + pad)
    for i, ovn in enumerate(OVERLAYS):
        ovp = ov_dir / f"{ovn}.png"
        pf = piece_dir / "piece-yellow.png"  # 最难的那个颜色
        if not (ovp.exists() and pf.exists()):
            continue
        ov = load(ovp)
        piece = np.asarray(
            Image.open(pf).convert("RGBA").resize((ov.shape[1], ov.shape[0]), Image.LANCZOS)
        ).astype(float)
        comp = alpha_composite(piece, ov)
        img = Image.fromarray(comp.clip(0, 255).astype("uint8"), "RGBA").resize(
            (thumb, thumb), Image.LANCZOS
        )
        canvas.alpha_composite(img, (pad + i * (thumb + pad), y))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out)
    print(f"\n验收图已存：{out}")
    print("  上 3 行 = 三种标记 x 六色棋子（深色底）；底部 = 40px 真实大小（香蕉，最难的颜色）")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, default=PIECES, help="叠加层所在目录")
    ap.add_argument("--preview", type=Path, help="另存六色合成总览")
    args = ap.parse_args()

    ov_dir: Path = args.dir
    all_fails: list[str] = []

    print(f"验收目录：{ov_dir}")
    print(f"棋子参照：{PIECES}\n")

    for name in OVERLAYS:
        p = ov_dir / f"{name}.png"
        print(f"[{name}]")
        if not p.exists():
            print("  文件不存在\n")
            all_fails.append(f"{name}: 文件不存在")
            continue
        fails, notes = check_one(p, PIECES)
        print("\n".join(notes))
        print()
        all_fails.extend(fails)

    if args.preview:
        build_preview(PIECES, ov_dir, args.preview)

    print("=" * 60)
    if all_fails:
        print(f"不通过（{len(all_fails)} 项）：")
        for f in all_fails:
            print(f"  - {f}")
        print("\n★ 优先级：可读性(§4) > 风格统一(§3)。")
        print("  若两者冲突，是工单的问题 —— 回工单调整，不要硬凑。")
        return 1

    print("全部通过：明暗跨度已收进水果区间，六色可见性 Δ >= 20，面积未超限。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
