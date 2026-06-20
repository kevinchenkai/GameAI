extends Node2D
## 单个棋盘格（Tile.tscn 根节点）。
##
## Task 2：占位渲染——按格子类型上色的圆形 + 可切换的调试编号标签。
## 正式格子图标（assets/sprites/tiles/）在 Task 8 接入。

const RADIUS := 42.0

## 占位配色（按 tile_type，对照 CLAUDE_TASKS Task 2 实现要点）。
const TYPE_COLORS := {
	"start": Color("f4c430"),         # 起点 金
	"normal": Color("c9c9c9"),        # 普通 灰
	"reward": Color("5fbf6a"),        # 奖励 绿
	"punish": Color("e0524a"),        # 惩罚 红
	"warp": Color("9b6fd6"),          # 传送 紫
	"post_station": Color("4a90e0"),  # 驿站 蓝
	"special": Color("e8923d"),       # 特殊 橙
	"finish": Color("f4c430"),        # 终点 金
}

var _index: int = 0
var _tile_type: String = "normal"

@onready var _label: Label = $IndexLabel

## 由 Board 在生成时调用，设定该格数据与坐标。
func setup(index: int, tile_type: String, world_pos: Vector2) -> void:
	_index = index
	_tile_type = tile_type
	position = world_pos
	if _label:
		_label.text = str(index)
	queue_redraw()

## 切换调试编号显示。
func set_debug_index_visible(v: bool) -> void:
	if _label:
		_label.visible = v

func _draw() -> void:
	var col: Color = TYPE_COLORS.get(_tile_type, TYPE_COLORS["normal"])
	draw_circle(Vector2.ZERO, RADIUS, col)
	draw_arc(Vector2.ZERO, RADIUS, 0.0, TAU, 32, Color(0, 0, 0, 0.35), 2.0, true)
