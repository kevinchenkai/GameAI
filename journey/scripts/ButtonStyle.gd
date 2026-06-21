class_name ButtonStyle
extends RefCounted
## 国风按钮样式工具（程序化 StyleBox，无需美术素材）。
##
## S5：选择页「选择」、结算页「重新开始」按钮统一外观——暖木底 + 金描边圆角
## + hover/press/disabled 四态。纯代码绘制（CLAUDE.md §2：不依赖美术像素）。

## 主调色（取经暖金主题，与 select_bg / result_bg 协调）。
const COL_BASE := Color(0.62, 0.36, 0.12)        # 暖木底
const COL_HOVER := Color(0.74, 0.46, 0.16)       # 悬停提亮
const COL_PRESS := Color(0.50, 0.28, 0.08)       # 按下压暗
const COL_DISABLED := Color(0.55, 0.50, 0.42, 0.7)
const COL_BORDER := Color(0.95, 0.80, 0.38)      # 金描边
const COL_BORDER_DISABLED := Color(0.7, 0.66, 0.55)
const COL_TEXT := Color(1.0, 0.97, 0.88)
const COL_TEXT_DISABLED := Color(0.85, 0.82, 0.75, 0.8)
const CORNER := 14
const BORDER_W := 3

## 构造一个填充态 StyleBox。
static func _flat(bg: Color, border: Color, border_w: int = BORDER_W) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_border_width_all(border_w)
	sb.border_color = border
	sb.set_corner_radius_all(CORNER)
	sb.set_content_margin_all(10.0)
	sb.content_margin_left = 26.0
	sb.content_margin_right = 26.0
	# 轻微立体感：底部加重描边 + 暗角阴影
	sb.shadow_color = Color(0, 0, 0, 0.28)
	sb.shadow_size = 5
	sb.shadow_offset = Vector2(0, 3)
	return sb

## 把国风样式应用到一个 Button（四态 + 字色 + 字号）。
static func apply(btn: Button, font_size: int = 24) -> void:
	btn.add_theme_stylebox_override("normal", _flat(COL_BASE, COL_BORDER))
	btn.add_theme_stylebox_override("hover", _flat(COL_HOVER, COL_BORDER))
	btn.add_theme_stylebox_override("pressed", _flat(COL_PRESS, COL_BORDER))
	btn.add_theme_stylebox_override("focus", _flat(COL_HOVER, COL_BORDER))
	btn.add_theme_stylebox_override("disabled", _flat(COL_DISABLED, COL_BORDER_DISABLED, 2))
	btn.add_theme_color_override("font_color", COL_TEXT)
	btn.add_theme_color_override("font_hover_color", COL_TEXT)
	btn.add_theme_color_override("font_pressed_color", COL_TEXT)
	btn.add_theme_color_override("font_focus_color", COL_TEXT)
	btn.add_theme_color_override("font_disabled_color", COL_TEXT_DISABLED)
	btn.add_theme_font_size_override("font_size", font_size)
