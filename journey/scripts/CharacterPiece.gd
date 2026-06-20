extends Node2D
## 角色棋子（CharacterPiece.tscn 根节点）。
##
## Task 3：表示一个角色，保存当前格、执行逐格移动动画、同格四角偏移、
## 预留状态图标与气泡挂点。被动技能/状态结算在后续任务接入。

## 同格四子偏移（左上/右上/左下/右下），见主方案 §3.4.4。
const SLOT_OFFSETS := [
	Vector2(-22, -22),
	Vector2(22, -22),
	Vector2(-22, 22),
	Vector2(22, 22),
]
const RADIUS := 26.0
const STEP_TIME := 0.18  # 每格移动时长（秒）

## 移动播放完成（逐格动画走完最终落点）时发出，附带落点 index。
signal move_finished(final_index: int)
## 每经过一格（落地中途或终点）时发出，供事件/碰撞结算用。
signal stepped_on(index: int)

var character_id: String = ""
var character_name: String = ""
var current_index: int = 1
var slot: int = 0                  # 同格槽位 0..3，决定四角偏移
var _color: Color = Color.WHITE
var _moving: bool = false

@onready var _bubble: Label = $BubbleAnchor/Bubble
@onready var _status_anchor: Node2D = $StatusAnchor

## 初始化棋子数据与起始位置。slot 决定同格时的四角偏移。
func setup(data: Dictionary, start_index: int, slot_idx: int) -> void:
	character_id = str(data.get("id", ""))
	character_name = str(data.get("name", ""))
	_color = Color(str(data.get("color", "ffffff")))
	slot = slot_idx
	current_index = start_index
	position = _tile_world_pos(start_index)
	if _bubble:
		_bubble.text = ""
		_bubble.visible = false
	queue_redraw()

## 该格世界坐标 + 槽位偏移。
func _tile_world_pos(index: int) -> Vector2:
	var base: Vector2 = BoardManager.get_tile_position(index)
	return base + SLOT_OFFSETS[slot % SLOT_OFFSETS.size()]

## 逐格移动到 target_index（沿 BoardManager 路径逐格 Tween）。
## 每经过一格发 stepped_on；走完发 move_finished。是 async：可 await。
func move_to(target_index: int) -> void:
	var steps: int = target_index - current_index
	await move_by(steps)

## 按步数移动（正前进 / 负后退）。逐格走，便于将来在中途格触发逻辑。
func move_by(steps: int) -> void:
	if _moving or steps == 0:
		if steps == 0:
			move_finished.emit(current_index)
		return
	_moving = true
	var path: Array[int] = BoardManager.get_move_path(current_index, steps)
	for idx in path:
		var tween := create_tween()
		tween.tween_property(self, "position", _tile_world_pos(idx), STEP_TIME)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		await tween.finished
		current_index = idx
		stepped_on.emit(idx)
	_moving = false
	move_finished.emit(current_index)

## 立即（无动画）放到某格，用于交换/传送/重排序的瞬移渲染。
func snap_to(index: int) -> void:
	current_index = index
	position = _tile_world_pos(index)

## 是否正在移动。
func is_moving() -> bool:
	return _moving

## 设置同格槽位并刷新位置（碰撞/多子同格时由上层调整）。
func set_slot(slot_idx: int) -> void:
	slot = slot_idx
	position = _tile_world_pos(current_index)

## 显示一段角色气泡（如八戒防击退台词），duration 秒后自动隐藏。
func show_bubble(text: String, duration: float = 1.5) -> void:
	if not _bubble:
		return
	_bubble.text = text
	_bubble.visible = true
	var t := get_tree().create_timer(duration)
	await t.timeout
	if _bubble and _bubble.text == text:
		_bubble.visible = false

## 状态图标挂点（供 Task 6 挂护盾/停留等图标）。
func get_status_anchor() -> Node2D:
	return _status_anchor

func _draw() -> void:
	draw_circle(Vector2.ZERO, RADIUS, _color)
	draw_arc(Vector2.ZERO, RADIUS, 0.0, TAU, 28, Color(0, 0, 0, 0.5), 2.5, true)
	# 占位：画角色名首字（正式棋子图在 Task 8 接入）
	if character_name != "":
		var f := ThemeDB.fallback_font
		var ch := character_name.substr(0, 1)
		var size := 22
		var w := f.get_string_size(ch, HORIZONTAL_ALIGNMENT_CENTER, -1, size).x
		draw_string(f, Vector2(-w * 0.5, size * 0.35), ch, HORIZONTAL_ALIGNMENT_CENTER, -1, size, Color.WHITE)
