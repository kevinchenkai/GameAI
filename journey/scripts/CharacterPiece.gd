extends Node2D
## 角色棋子（CharacterPiece.tscn 根节点）。
##
## Task 3：表示一个角色，保存当前格、执行逐格移动动画、同格四角偏移、
## 预留状态图标与气泡挂点。被动技能/状态结算在后续任务接入。

## 同格四子偏移（左上/右上/左下/右下），见主方案 §3.4.4。
const SLOT_OFFSETS := [
	Vector2(-16, -14),
	Vector2(16, -14),
	Vector2(-16, 14),
	Vector2(16, 14),
]
const RADIUS := 26.0          # 护盾光圈/状态角标半径
const SPRITE_SIZE := 84.0     # 角色立绘显示直径（S2：调大到合适尺寸）
const STEP_TIME := 0.18       # 每格移动时长（秒）

## 移动播放完成（逐格动画走完最终落点）时发出，附带落点 index。
signal move_finished(final_index: int)
## 每经过一格（落地中途或终点）时发出，供事件/碰撞结算用。
signal stepped_on(index: int)

var character_id: String = ""
var character_name: String = ""
var current_index: int = 1
var slot: int = 0                  # 同格槽位 0..3，决定四角偏移
var _color: Color = Color.WHITE
var _sprite: Texture2D = null
var _moving: bool = false
## 停留层数（支撑 §3.4.2 停留跳过）。
var stay_count: int = 0
## 通用状态计数（§7）：shield / negate_negative / counter_shield / dice_minus / dice_plus。
## EventManager 只负责 grant（授予）；抵消/消耗逻辑在 Task 6（SkillManager）接入。
var status: Dictionary = {
	"shield": 0,
	"negate_negative": 0,
	"counter_shield": 0,
	"dice_minus": 0,
	"dice_plus": 0,
}

@onready var _bubble: Label = $BubbleAnchor/Bubble
@onready var _status_anchor: Node2D = $StatusAnchor

## 初始化棋子数据与起始位置。slot 决定同格时的四角偏移。
func setup(data: Dictionary, start_index: int, slot_idx: int) -> void:
	character_id = str(data.get("id", ""))
	character_name = str(data.get("name", ""))
	_color = Color(str(data.get("color", "ffffff")))
	var sprite_path := str(data.get("sprite", ""))
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		_sprite = load(sprite_path)
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

## 施加停留（事件如流沙陷落调用）。
func add_stay(turns: int = 1) -> void:
	stay_count += turns
	queue_redraw()

## 回合开始时调用：若处于停留则消耗 1 层并返回 true（本回合跳过）。
func consume_stay() -> bool:
	if stay_count > 0:
		stay_count -= 1
		queue_redraw()
		return true
	return false

## 授予状态。shield 上限由调用方（含 balance.shield_max）控制；此处只加计数。
func grant_status(key: String, amount: int = 1) -> void:
	if status.has(key):
		status[key] = max(0, status[key] + amount)
	_refresh_status_label()

## 当前某状态层数。
func get_status(key: String) -> int:
	return int(status.get(key, 0))

## 清除负面状态（火眼金睛/子母河清泉/弥勒相助）：复位 dice_minus 与停留。
## 注意：护盾/免疫/反击属增益，不清除。
func clear_negative_status() -> void:
	status["dice_minus"] = 0
	stay_count = 0
	_refresh_status_label()

## 占位状态文本（Task 6 替换为图标）。
func _refresh_status_label() -> void:
	queue_redraw()

## 已抵达终点（≥72），用于交换/重排序/碰撞豁免（§3.4.4 / §3.4.6）。
func is_finished() -> bool:
	return current_index >= 72

func _draw() -> void:
	# 护盾：淡金色光圈（§6.3），层数越多越亮
	var shield: int = int(status.get("shield", 0))
	if shield > 0:
		var glow := Color(1.0, 0.86, 0.35, 0.35 + 0.2 * shield)
		draw_arc(Vector2.ZERO, RADIUS + 6.0, 0.0, TAU, 32, glow, 5.0, true)
	if _sprite:
		# 正式棋子图，底部略压在格位上、主体在格位上方（站在路面石板上的观感）
		var d := SPRITE_SIZE
		draw_texture_rect(_sprite, Rect2(-d * 0.5, -d * 0.82, d, d), false)
	else:
		# 占位：彩色圆 + 角色名首字
		draw_circle(Vector2.ZERO, RADIUS, _color)
		draw_arc(Vector2.ZERO, RADIUS, 0.0, TAU, 28, Color(0, 0, 0, 0.5), 2.5, true)
		if character_name != "":
			var f := ThemeDB.fallback_font
			var ch := character_name.substr(0, 1)
			var size := 22
			var w := f.get_string_size(ch, HORIZONTAL_ALIGNMENT_CENTER, -1, size).x
			draw_string(f, Vector2(-w * 0.5, size * 0.35), ch, HORIZONTAL_ALIGNMENT_CENTER, -1, size, Color.WHITE)
	# 状态角标：停留/免疫/反击 小圆点
	var badges: Array = []
	if stay_count > 0:
		badges.append(Color(0.9, 0.4, 0.2))           # 停留 橙红
	if int(status.get("negate_negative", 0)) > 0:
		badges.append(Color(0.3, 0.8, 0.9))           # 免疫 青
	if int(status.get("counter_shield", 0)) > 0:
		badges.append(Color(0.8, 0.5, 0.9))           # 反击 紫
	for i in badges.size():
		draw_circle(Vector2(-RADIUS + 6 + i * 12, RADIUS - 4), 5.0, badges[i])
