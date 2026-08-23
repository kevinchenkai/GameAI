#!/usr/bin/env python3
"""Generate deterministic M4 placeholder WebP assets.

These files exercise the real manifest, sizing, alpha, and loading paths. Do not
run with --force after approved art has replaced the placeholders.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "public" / "assets"
CREAM = "#FFF6E3"
BROWN = "#8A542B"
LIGHT_BROWN = "#B08355"


def save(image: Image.Image, relative_path: str, force: bool) -> None:
    destination = ROOT / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and not force:
        return
    image.save(destination, "WEBP", lossless=True, method=6)


def transparent(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def tile_icon(kind: str, color: str) -> Image.Image:
    image = transparent((256, 256))
    draw = ImageDraw.Draw(image)
    stroke = 11
    if kind == "paw":
        draw.ellipse((72, 88, 184, 204), fill=color, outline=BROWN, width=stroke)
        for box in [(45, 49, 91, 100), (85, 31, 129, 84), (129, 31, 173, 84), (168, 49, 214, 100)]:
            draw.ellipse(box, fill=color, outline=BROWN, width=stroke)
    elif kind == "grass":
        draw.polygon([(45, 210), (58, 90), (103, 150), (128, 38), (154, 147), (206, 83), (211, 210)], fill=color, outline=BROWN)
        draw.line([(45, 210), (211, 210)], fill=BROWN, width=stroke)
    elif kind == "watering":
        draw.rounded_rectangle((75, 85, 190, 202), radius=28, fill=color, outline=BROWN, width=stroke)
        draw.ellipse((150, 68, 225, 153), fill=None, outline=BROWN, width=stroke)
        draw.polygon([(81, 112), (25, 69), (18, 91), (76, 157)], fill=color, outline=BROWN)
    elif kind == "bell":
        draw.polygon([(64, 196), (82, 170), (92, 83), (128, 55), (164, 83), (174, 170), (193, 196)], fill=color, outline=BROWN)
        draw.ellipse((108, 34, 148, 74), fill=color, outline=BROWN, width=stroke)
        draw.line([(84, 174), (174, 174)], fill="#FFE787", width=8)
    elif kind == "fish":
        draw.ellipse((45, 75, 190, 183), fill=color, outline=BROWN, width=stroke)
        draw.polygon([(182, 128), (231, 80), (231, 177)], fill=color, outline=BROWN)
        draw.ellipse((76, 103, 96, 123), fill="#FFFFFF", outline=BROWN, width=5)
    elif kind == "yarn":
        draw.ellipse((42, 42, 214, 214), fill=color, outline=BROWN, width=stroke)
        draw.arc((67, 55, 188, 201), 60, 285, fill="#8053A7", width=8)
        draw.arc((54, 78, 203, 178), 190, 530, fill="#8053A7", width=8)
        draw.line([(174, 192), (216, 225)], fill="#8053A7", width=9)
    elif kind == "bone":
        draw.rounded_rectangle((55, 102, 201, 154), radius=23, fill=color, outline=BROWN, width=stroke)
        for box in [(28, 77, 89, 131), (28, 125, 89, 179), (167, 77, 228, 131), (167, 125, 228, 179)]:
            draw.ellipse(box, fill=color, outline=BROWN, width=stroke)
    elif kind == "flowerpot":
        draw.polygon([(67, 103), (190, 103), (173, 211), (84, 211)], fill=color, outline=BROWN)
        draw.rounded_rectangle((56, 86, 201, 122), radius=12, fill="#E49B65", outline=BROWN, width=stroke)
        draw.line([(128, 87), (128, 53)], fill="#4F9D5B", width=9)
        for center in [(128, 37), (111, 49), (145, 49)]:
            x, y = center
            draw.ellipse((x - 14, y - 14, x + 14, y + 14), fill="#FFC93C", outline=BROWN, width=5)
    return image


def tile_frame() -> Image.Image:
    image = transparent((256, 256))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 23, 238, 243), radius=32, fill=(110, 74, 42, 35))
    draw.rounded_rectangle((12, 12, 232, 232), radius=32, fill=CREAM, outline=LIGHT_BROWN, width=8)
    draw.rounded_rectangle((23, 23, 221, 221), radius=23, outline="#FFFDF8", width=5)
    return image


def tray_slot(warn: bool) -> Image.Image:
    image = transparent((200, 200))
    draw = ImageDraw.Draw(image)
    outline = "#FFAA45" if warn else "#C9AD84"
    draw.rounded_rectangle((12, 12, 188, 188), radius=28, fill="#F6EAD2", outline=outline, width=10 if warn else 6)
    draw.rounded_rectangle((27, 27, 173, 173), radius=20, outline="#E2CDAA", width=5)
    return image


def button(size: int, color: str, kind: str) -> Image.Image:
    image = transparent((size, size))
    draw = ImageDraw.Draw(image)
    inset = max(10, size // 16)
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=size // 5, fill=color, outline=LIGHT_BROWN, width=max(5, size // 32))
    white = "#FFFDF8"
    width = max(9, size // 22)
    if kind == "shuffle":
        draw.line([(size * .27, size * .38), (size * .42, size * .38), (size * .62, size * .62), (size * .75, size * .62)], fill=white, width=width, joint="curve")
        draw.line([(size * .27, size * .64), (size * .42, size * .64), (size * .62, size * .38), (size * .75, size * .38)], fill=white, width=width, joint="curve")
        draw.polygon([(size * .72, size * .28), (size * .84, size * .38), (size * .72, size * .48)], fill=white)
        draw.polygon([(size * .72, size * .52), (size * .84, size * .62), (size * .72, size * .72)], fill=white)
    elif kind == "undo":
        draw.arc((size * .27, size * .27, size * .75, size * .75), 205, 500, fill=white, width=width)
        draw.polygon([(size * .22, size * .42), (size * .42, size * .30), (size * .40, size * .52)], fill=white)
    elif kind == "settings":
        draw.ellipse((size * .33, size * .33, size * .67, size * .67), outline=white, width=width)
        for x1, y1, x2, y2 in [(.5,.16,.5,.31),(.5,.69,.5,.84),(.16,.5,.31,.5),(.69,.5,.84,.5)]:
            draw.line((size*x1,size*y1,size*x2,size*y2), fill=white, width=width)
    elif kind == "hint":
        draw.ellipse((size * .35, size * .22, size * .65, size * .57), outline=white, width=width)
        draw.line((size * .43, size * .62, size * .57, size * .62), fill=white, width=width)
        draw.line((size * .45, size * .70, size * .55, size * .70), fill=white, width=width)
    return image


def panel(cold: bool) -> Image.Image:
    image = transparent((800, 900))
    draw = ImageDraw.Draw(image)
    fill = "#EEF5FF" if cold else CREAM
    outline = "#8196B8" if cold else LIGHT_BROWN
    draw.rounded_rectangle((35, 45, 765, 865), radius=90, fill=(80, 65, 50, 32))
    draw.rounded_rectangle((24, 24, 752, 844), radius=90, fill=fill, outline=outline, width=18)
    return image


def background(home: bool) -> Image.Image:
    width, height = 1125, 2436
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    top = (143, 208, 255)
    bottom = (232, 245, 255)
    for y in range(height):
        t = y / (height - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
        for x in range(width):
            pixels[x, y] = color
    draw = ImageDraw.Draw(image, "RGBA")
    for cx, cy, scale in [(210, 410, 1.0), (870, 650, .72), (560, 250, .55)]:
        draw.ellipse((cx - 120*scale, cy - 45*scale, cx + 20*scale, cy + 65*scale), fill=(255,255,255,145))
        draw.ellipse((cx - 25*scale, cy - 90*scale, cx + 125*scale, cy + 70*scale), fill=(255,255,255,145))
        draw.rounded_rectangle((cx - 135*scale, cy, cx + 145*scale, cy + 75*scale), radius=35*scale, fill=(255,255,255,145))
    if home:
        draw.rectangle((0, height * .79, width, height), fill=(128, 205, 119, 210))
        draw.ellipse((445, 1710, 680, 2060), fill=(255, 246, 227, 155), outline=(176, 131, 85, 120), width=14)
        draw.polygon([(470, 1770), (505, 1650), (550, 1770), (575, 1770), (625, 1650), (655, 1770)], fill=(255, 246, 227, 155))
    else:
        draw.ellipse((850, 1220, 1040, 1410), fill=(255,255,255,24), outline=(255,255,255,34), width=14)
        draw.ellipse((885, 1160, 935, 1220), fill=(255,255,255,24))
        draw.ellipse((950, 1160, 1000, 1220), fill=(255,255,255,24))
    return image


def sparkle(points: int, small: bool = False) -> Image.Image:
    size = 128
    image = transparent((size, size))
    draw = ImageDraw.Draw(image)
    radius = 42 if not small else 32
    inner = 10
    vertices = []
    for index in range(points * 2):
        angle = -3.14159 / 2 + index * 3.14159 / points
        r = radius if index % 2 == 0 else inner
        vertices.append((64 + r * __import__("math").cos(angle), 64 + r * __import__("math").sin(angle)))
    draw.polygon(vertices, fill="#FFF8D8", outline="#FFFFFF")
    return image


def star() -> Image.Image:
    import math
    image = transparent((256, 256))
    draw = ImageDraw.Draw(image)
    vertices = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = 105 if index % 2 == 0 else 46
        vertices.append((128 + radius * math.cos(angle), 128 + radius * math.sin(angle)))
    draw.polygon(vertices, fill="#FFC93C", outline=BROWN)
    draw.line(vertices + [vertices[0]], fill=BROWN, width=10, joint="curve")
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    force = parser.parse_args().force
    tile_colors = {
        "paw": "#FF8FA3", "grass": "#5FBF6A", "watering": "#54A8E0", "bell": "#FFC93C",
        "fish": "#FF9A5C", "yarn": "#B98BE0", "bone": "#EFE6D2", "flowerpot": "#C97B4A",
    }
    for name, color in tile_colors.items():
        save(tile_icon(name, color), f"tiles/{name}.webp", force)
    save(tile_frame(), "ui/tile_frame.webp", force)
    save(tray_slot(False), "ui/tray_slot.webp", force)
    save(tray_slot(True), "ui/tray_slot_warn.webp", force)
    save(button(320, "#FFD76B", "shuffle"), "ui/btn_shuffle.webp", force)
    save(button(320, "#FFADC0", "undo"), "ui/btn_undo.webp", force)
    save(button(200, "#9F91DC", "settings"), "ui/btn_settings.webp", force)
    save(button(320, "#71BDEA", "hint"), "ui/btn_hint.webp", force)
    save(panel(False), "ui/panel_win.webp", force)
    save(panel(True), "ui/panel_fail.webp", force)
    save(background(False), "bg/game_bg.webp", force)
    save(background(True), "bg/home_bg.webp", force)
    save(sparkle(4), "fx/sparkle_01.webp", force)
    save(sparkle(6, True), "fx/sparkle_02.webp", force)
    save(star(), "fx/star.webp", force)


if __name__ == "__main__":
    main()
