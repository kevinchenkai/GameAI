extends Node2D
## 单个棋盘格（Tile.tscn 根节点）。
##
## S1：背景已画好路面石板格位，格子节点只在格位上**叠加类型标记图标**
## （奖励/惩罚/驿站/传送/终点），普通格不叠图（露出路面石板即可）。
## 调试编号标签可切换。

const RADIUS := 32.0
const ICON_SIZE := 56.0  # 叠加图标直径（小于路面石板，居中其上）

## 这些类型不叠图标（露出背景路面石板）。
const PLAIN_TYPES := ["normal", "start"]

## tile_type -> 图标文件（无映射者用占位圆）。
const TYPE_ICONS := {
	"normal": "res://assets/sprites/tiles/tile_normal.png",
	"reward": "res://assets/sprites/tiles/tile_reward.png",
	"punish": "res://assets/sprites/tiles/tile_punish.png",
	"warp": "res://assets/sprites/tiles/tile_warp.png",
	"post_station": "res://assets/sprites/tiles/tile_post_station.png",
	"finish": "res://assets/sprites/tiles/tile_finish.png",
	"start": "res://assets/sprites/tiles/tile_finish.png",  # 起点复用金色终点图
}

## 占位配色（仅未映射图标的类型用，如 special）。
const TYPE_COLORS := {
	"start": Color("f4c430"),
	"normal": Color("c9c9c9"),
	"reward": Color("5fbf6a"),
	"punish": Color("e0524a"),
	"warp": Color("9b6fd6"),
	"post_station": Color("4a90e0"),
	"special": Color("e8923d"),
	"finish": Color("f4c430"),
}

var _index: int = 0
var _tile_type: String = "normal"
var _texture: Texture2D = null

@onready var _label: Label = $IndexLabel

## 由 Board 在生成时调用，设定该格数据与坐标。
func setup(index: int, tile_type: String, world_pos: Vector2) -> void:
	_index = index
	_tile_type = tile_type
	position = world_pos
	# 普通/起点格不叠图标，露出背景路面石板
	if tile_type not in PLAIN_TYPES:
		var path: String = TYPE_ICONS.get(tile_type, "")
		if path != "" and ResourceLoader.exists(path):
			_texture = load(path)
	if _label:
		_label.text = str(index)
	queue_redraw()

## 切换调试编号显示。
func set_debug_index_visible(v: bool) -> void:
	if _label:
		_label.visible = v

func _draw() -> void:
	if _texture:
		var s := ICON_SIZE
		draw_texture_rect(_texture, Rect2(-s * 0.5, -s * 0.5, s, s), false)
	elif _tile_type == "special":
		# special 无专属图标：画一个小橙环标记（不遮挡路面石板）
		draw_arc(Vector2.ZERO, RADIUS * 0.6, 0.0, TAU, 24, Color("e8923d"), 3.0, true)
	# 其余（normal/start）不画，露出背景路面石板
