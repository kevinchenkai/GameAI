extends Node
## 游戏主状态机单例（autoload: GameManager）。
##
## 主状态机与回合循环（主方案 §10.1 转移图）。Task 4 接入真实回合驱动：
## TURN_START →(stay)→ NEXT_TURN / →(正常)→ ROLL_DICE → MOVE_PIECE →
## RESOLVE_TILE_EVENT → RESOLVE_COLLISION → CHECK_WIN → NEXT_TURN。
## 事件/碰撞/技能在 Task 5/6 接入；当前这两步为占位透传。

## 主状态机状态（对应主方案 §10.1）。
enum State {
	INIT,
	CHARACTER_SELECT,
	GAME_START,
	TURN_START,
	ROLL_DICE,
	MOVE_PIECE,
	RESOLVE_TILE_EVENT,
	RESOLVE_COLLISION,
	CHECK_WIN,
	NEXT_TURN,
	GAME_OVER,
}

const CHARACTERS_PATH := "res://data/characters.json"
const WIN_INDEX := 72

## 状态变更信号，供 UI / 其它模块解耦订阅。
signal state_changed(from_state: State, to_state: State)
## 新回合开始（当前行动者 id / name / 是否玩家）。
signal turn_started(character_id: String, character_name: String, is_player: bool)
## 等待玩家掷骰（玩家回合时发出，UI 据此启用骰子按钮）。
signal await_player_roll()
## 游戏结束（胜者 character_id）。
signal game_over(winner_id: String)

var _state: State = State.INIT
var _roster: Array = []                      # characters.json
var _selected_player_id: String = ""          # CharacterSelect 选定，GameScene 读取
var _pieces: Dictionary = {}                 # character_id -> CharacterPiece
var _player_id: String = ""
var _winner_id: String = ""
var _dice: Node = null                        # DiceController（由 GameScene 注入）
var _ai: Node = null                          # AIController（由 GameScene 注入）
var _popup: Node = null                        # EventPopup（由 GameScene 注入）

# 当前回合临时标记
var _pending_roll: int = 0
var _re_roll_used: bool = false

func _ready() -> void:
	print("[GameManager] ready. RNG seed = %d" % GameRng.get_seed())
	_load_roster()
	change_state(State.INIT)

# ---- 初始化 ----

func _load_roster() -> void:
	if not FileAccess.file_exists(CHARACTERS_PATH):
		push_error("[GameManager] 角色配置不存在：%s" % CHARACTERS_PATH)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(CHARACTERS_PATH))
	if typeof(parsed) != TYPE_ARRAY or (parsed as Array).is_empty():
		push_error("[GameManager] characters.json 解析失败或为空")
		return
	_roster = parsed
	print("[GameManager] 已加载 %d 个角色" % _roster.size())

func get_roster() -> Array:
	return _roster

## GameScene 注入控制器与棋子引用后调用，正式开局。
func register_runtime(dice: Node, ai: Node, pieces: Dictionary, popup: Node = null) -> void:
	_dice = dice
	_ai = ai
	_pieces = pieces
	_popup = popup

## 以玩家所选角色开始游戏（玩家插到首发，§3.4.7）。
func start_game(player_id: String) -> void:
	_player_id = player_id
	_winner_id = ""
	_re_roll_used = false
	TurnManager.setup(player_id)
	if _dice and not _dice.rolled.is_connected(_on_dice_rolled):
		_dice.rolled.connect(_on_dice_rolled)
	change_state(State.GAME_START)
	_next_turn()

# ---- 回合循环 ----

func _next_turn() -> void:
	if _state == State.GAME_OVER:
		return
	change_state(State.NEXT_TURN)
	var actor_id := TurnManager.advance()
	change_state(State.TURN_START)
	_re_roll_used = false

	var piece: Node = _pieces.get(actor_id)
	var data := _find_char(actor_id)
	var actor_name := str(data.get("name", actor_id))
	var is_player := TurnManager.is_player(actor_id)
	turn_started.emit(actor_id, actor_name, is_player)
	print("[Turn] === %s 的回合（%s）位于第 %d 格" % [actor_name, "玩家" if is_player else "AI", piece.current_index if piece else -1])

	# stay 状态：整回合跳过，不结算事件（§3.4.2 / 状态系统 Task 6 接入，此处预留）
	if piece and piece.has_method("consume_stay") and piece.consume_stay():
		print("[Turn] %s 处于停留，跳过本回合" % actor_name)
		_finish_turn()
		return

	change_state(State.ROLL_DICE)
	if is_player:
		if _dice:
			_dice.set_button_enabled(true)
		await_player_roll.emit()
	else:
		if _ai and _dice:
			await _ai.take_turn(_dice)

## 骰子结果回调（玩家点击或 AI 自动）→ 应用技能修正后移动。
func _on_dice_rolled(value: int) -> void:
	if _state != State.ROLL_DICE:
		return
	if _dice:
		_dice.set_button_enabled(false)
	var actor_id := TurnManager.current_id()
	var piece: Node = _pieces.get(actor_id)
	# on_before_dice：dice±1 消耗 + 孙悟空筋斗云（掷 6 +2）
	var pre: Dictionary = SkillManager.on_before_dice(piece, value)
	var steps: int = int(pre.get("steps", value))
	if str(pre.get("bubble", "")) != "" and piece:
		piece.show_bubble(str(pre.bubble))
	_pending_roll = steps
	await _do_move(steps, false)

## 执行一次移动并跑完后续结算链。is_event_move=true 表示事件引发的移动（§3.4.1：不再触发格事件）。
func _do_move(steps: int, is_event_move: bool) -> void:
	var actor_id := TurnManager.current_id()
	var piece: Node = _pieces.get(actor_id)
	if piece == null:
		_finish_turn()
		return

	change_state(State.MOVE_PIECE)
	var from_index: int = piece.current_index
	await piece.move_by(steps)

	# 经过驿站：唐僧每过一个驿站 +1 护盾（§6.3）。仅前进路径计数。
	if steps > 0:
		for idx in BoardManager.get_move_path(from_index, steps):
			if BoardManager.is_post_station(idx):
				SkillManager.on_pass_post_station(piece)

	# 每次移动后即时判胜（§3.4.3）
	change_state(State.CHECK_WIN)
	if piece.current_index >= WIN_INDEX:
		_declare_winner(actor_id)
		return

	# 事件结算：仅骰子移动落地才触发；事件移动不再二次触发（§3.4.1）
	if not is_event_move:
		change_state(State.RESOLVE_TILE_EVENT)
		var eid: Variant = BoardManager.get_event_id(piece.current_index)
		if eid != null:
			var handled := await _resolve_event(String(eid), actor_id, piece)
			if handled == "winner_declared":
				return
			if handled == "re_roll":
				await _do_reroll()
				return  # 再掷链自行收尾

	# 碰撞/击退结算（§3.4.4 / §3.4.5）
	change_state(State.RESOLVE_COLLISION)
	_resolve_collision(piece)
	if _state == State.GAME_OVER:
		return

	_finish_turn()

## 落地后碰撞结算：actor 踩中同格其他角色则触发击退（起点/终点豁免）。
func _resolve_collision(actor: Node) -> void:
	var idx: int = actor.current_index
	# 起点豁免（§3.4.4）
	if idx <= 1 or idx >= WIN_INDEX:
		return
	for other in _pieces_array():
		if other == actor or other.is_finished():
			continue
		if other.current_index != idx:
			continue
		# actor 踩中 other → 结算击退
		var kb: Dictionary = SkillManager.on_knockback(other, actor)
		if str(kb.get("bubble", "")) != "":
			other.show_bubble(str(kb.bubble))
		var tb: int = int(kb.get("target_back", 0))
		if tb > 0:
			var path := BoardManager.get_move_path(other.current_index, -tb)
			if path.size() > 0:
				other.snap_to(path[-1])
		var ab: int = int(kb.get("attacker_back", 0))
		if ab > 0:
			var apath := BoardManager.get_move_path(actor.current_index, -ab)
			if apath.size() > 0:
				actor.snap_to(apath[-1])
		_resettle_slots_at(idx)

## 结算落地格事件，按 outcome 执行后续。返回 "ok" / "re_roll" / "winner_declared"。
func _resolve_event(event_id: String, actor_id: String, piece: Node) -> String:
	var outcome: Dictionary = EventManager.resolve(event_id, piece, _pieces_array())
	if _popup:
		await _popup.show_event(outcome)

	match str(outcome.get("follow_up", "none")):
		"finish":
			_declare_winner(actor_id)
			return "winner_declared"
		"event_move":
			await _do_move(int(outcome.get("steps", 0)), true)  # 事件移动，不再触发
			return "winner_declared" if _state == State.GAME_OVER else "ok"
		"warp":
			piece.snap_to(int(outcome.get("target", piece.current_index)))
			change_state(State.CHECK_WIN)
			if piece.current_index >= WIN_INDEX:
				_declare_winner(actor_id)
				return "winner_declared"
			return "ok"
		"re_roll":
			return "re_roll"
		_:
			# stay / none：交换/重排序/状态授予/清负面已在 resolve 内完成
			return "ok"

## 再掷一次（§3.4.2：单回合限 1 次）。
func _do_reroll() -> void:
	if _re_roll_used:
		_finish_turn()
		return
	_re_roll_used = true
	var actor_id := TurnManager.current_id()
	var is_player := TurnManager.is_player(actor_id)
	change_state(State.ROLL_DICE)
	if is_player:
		if _dice:
			_dice.set_button_enabled(true)
		await_player_roll.emit()
	else:
		if _ai and _dice:
			await _ai.take_turn(_dice)

## 当前棋子数组（事件交换/重排序用）。
func _pieces_array() -> Array:
	var arr: Array = []
	for cid in _pieces:
		arr.append(_pieces[cid])
	return arr

## 重设某格上所有同格棋子的四角槽位（碰撞/击退后刷新渲染）。
func _resettle_slots_at(_index: int) -> void:
	# 全量按格分组重设 slot，保证同格多子分占不同角
	var by_index: Dictionary = {}
	for p in _pieces_array():
		var key: int = p.current_index
		if not by_index.has(key):
			by_index[key] = []
		by_index[key].append(p)
	for key in by_index.keys():
		var group: Array = by_index[key]
		for s in group.size():
			group[s].set_slot(s)

## 结束当前回合，切换下一个。
func _finish_turn() -> void:
	if _state == State.GAME_OVER:
		return
	# 用 call_deferred 避免在信号/await 链里深递归
	call_deferred("_next_turn")

func _declare_winner(winner_id: String) -> void:
	_winner_id = winner_id
	change_state(State.GAME_OVER)
	var data := _find_char(winner_id)
	print("[GameOver] 胜者：%s" % str(data.get("name", winner_id)))
	game_over.emit(winner_id)

# ---- 工具 ----

func _find_char(character_id: String) -> Dictionary:
	for c in _roster:
		if typeof(c) == TYPE_DICTIONARY and c.get("id", "") == character_id:
			return c
	return {}

func change_state(next: State) -> void:
	var prev := _state
	_state = next
	state_changed.emit(prev, next)

func get_state() -> State:
	return _state

func get_winner() -> String:
	return _winner_id

## 当前排名：按 current_index 降序（已达终点者 index>=72 自然靠前）。
## 返回 Array[Dictionary]：{ rank, id, name, index, is_player, is_winner }。
func get_ranking() -> Array:
	var rows: Array = []
	for cid in _pieces:
		var p: Node = _pieces[cid]
		var data := _find_char(cid)
		rows.append({
			"id": cid,
			"name": str(data.get("name", cid)),
			"index": p.current_index,
			"is_player": TurnManager.is_player(cid),
			"is_winner": cid == _winner_id,
		})
	rows.sort_custom(func(a, b): return a["index"] > b["index"])
	for i in rows.size():
		rows[i]["rank"] = i + 1
	return rows

## 玩家所选角色 id。
func get_player_id() -> String:
	return _player_id

## CharacterSelect 设定玩家角色（跨场景传递）。
func set_selected_player(character_id: String) -> void:
	_selected_player_id = character_id

## 取选定的玩家角色；未选时回退花名册首位。
func get_selected_player() -> String:
	if _selected_player_id != "" :
		return _selected_player_id
	if not _roster.is_empty():
		return String(_roster[0].get("id", "sun_wukong"))
	return "sun_wukong"
