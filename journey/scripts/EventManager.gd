extends Node
## 事件原始效果结算单例（autoload: EventManager）。
##
## 职责（主方案 §10.6）：按 events.json 的 effect_type 计算**原始效果**。
## 只算原始效果——技能加成与护盾抵消由 SkillManager 在 Task 6 介入，此处不做技能判断。
##
## resolve() 返回 outcome 字典，由 GameManager 执行后续移动/再掷（GameManager 持有
## 动画、即时判胜与"事件移动不再二次触发"标记，见 §3.4.1 / §3.4.3）。
##
## outcome.follow_up 取值：
##   "none"        无后续
##   "event_move"  需移动 outcome.steps 格（事件移动，落地不再触发事件）
##   "warp"        需瞬移到 outcome.target（事件移动，不再触发）
##   "re_roll"     需再掷一次（§3.4.2，GameManager 控制单回合限 1 次）
##   "stay"        已施加停留（无移动）
##   "finish"      终点格，触发胜利结算

const EVENTS_PATH := "res://data/events.json"
const BALANCE_PATH := "res://data/balance.json"

var _events: Dictionary = {}     # id -> event dict
var _shield_max: int = 2

func _ready() -> void:
	_load_events()
	_shield_max = _load_int(BALANCE_PATH, "shield_max", 2)

func _load_events() -> void:
	if not FileAccess.file_exists(EVENTS_PATH):
		push_error("[EventManager] 事件配置不存在：%s" % EVENTS_PATH)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(EVENTS_PATH))
	if typeof(parsed) != TYPE_ARRAY:
		push_error("[EventManager] events.json 不是合法数组")
		return
	for e in parsed:
		if typeof(e) == TYPE_DICTIONARY and e.has("id"):
			_events[e["id"]] = e
	print("[EventManager] 已加载 %d 个事件" % _events.size())

func _load_int(path: String, key: String, dflt: int) -> int:
	if not FileAccess.file_exists(path):
		return dflt
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) == TYPE_DICTIONARY:
		return int((parsed as Dictionary).get(key, dflt))
	return dflt

## 取事件数据（供 UI 弹窗）。
func get_event(event_id: String) -> Dictionary:
	return _events.get(event_id, {})

## 结算 event_id 对 actor 的原始效果。all_pieces: Array[CharacterPiece]。
## 返回 outcome 字典（含 follow_up / steps / target / name / description / negative / note）。
func resolve(event_id: String, actor: Node, all_pieces: Array) -> Dictionary:
	var ev: Dictionary = _events.get(event_id, {})
	var outcome := {
		"event_id": event_id,
		"name": str(ev.get("name", event_id)),
		"description": str(ev.get("description", "")),
		"effect_type": str(ev.get("effect_type", "")),
		"negative": bool(ev.get("negative", false)),
		"follow_up": "none",
		"steps": 0,
		"target": 0,
		"note": "",
		"negated": false,
	}
	if ev.is_empty():
		push_error("[EventManager] 未知 event_id：%s" % event_id)
		return outcome

	var et := str(ev.get("effect_type", ""))
	var value := int(ev.get("value", 0))
	var is_neg := bool(ev.get("negative", false))

	# 负面抵消（§3.4.5 / §7）：直接作用于自己的 negative 效果，先过免疫/护盾。
	# 中性位置事件（swap/reorder）negative=false，不会进入此分支。
	if is_neg and SkillManager.try_negate_negative(actor).negated:
		outcome.follow_up = "none"
		outcome.note = "效果被抵消"
		outcome.negated = true
		actor.show_bubble("抵消！")
		return outcome

	match et:
		"move_forward":
			outcome.follow_up = "event_move"
			outcome.steps = SkillManager.on_reward_move(actor, value)
		"move_backward":
			outcome.follow_up = "event_move"
			outcome.steps = SkillManager.on_negative_move(actor, -value)
		"warp_to":
			outcome.follow_up = "warp"
			outcome.target = value
		"stay":
			actor.add_stay(1)
			outcome.follow_up = "stay"
		"stay_and_shield":
			actor.add_stay(1)
			_grant_shield(actor)
			outcome.follow_up = "stay"
		"gain_status":
			_apply_gain_status(actor, str(ev.get("status", "")), value)
			outcome.follow_up = "none"
		"clear_negative":
			actor.clear_negative_status()
			outcome.follow_up = "none"
		"clear_then_forward":
			actor.clear_negative_status()
			outcome.follow_up = "event_move"
			outcome.steps = SkillManager.on_reward_move(actor, value)
		"re_roll":
			outcome.follow_up = "re_roll"
		"dice_gate":
			# 三打白骨精：掷骰 > value 前进 value，否则后退 value（§5.1）
			var r1 := GameRng.randi_range(1, 6)
			outcome.note = "判定骰 %d" % r1
			outcome.follow_up = "event_move"
			outcome.steps = value if r1 > value else -value
		"dice_gate_stay":
			# 牛魔王拦路：掷骰 < value 则停留（§5.1）
			var r2 := GameRng.randi_range(1, 6)
			outcome.note = "判定骰 %d" % r2
			if r2 < value:
				actor.add_stay(1)
				outcome.follow_up = "stay"
			else:
				outcome.follow_up = "none"
				outcome.note += "（通过）"
		"swap_random":
			outcome.note = _swap_random(actor, all_pieces)
			outcome.follow_up = "none"   # 交换为瞬移，落地不触发事件
		"swap_front":
			outcome.note = _swap_front(actor, all_pieces)
			outcome.follow_up = "none"
		"reorder_all":
			outcome.note = _reorder_all(all_pieces)
			outcome.follow_up = "none"
		"random_negative":
			outcome = _random_negative(actor, all_pieces, outcome)
		"finish":
			outcome.follow_up = "finish"
		_:
			push_error("[EventManager] 未实现的 effect_type：%s（%s）" % [et, event_id])

	return outcome

# ---- 状态授予（只 grant，抵消在 Task 6） ----

func _apply_gain_status(actor: Node, status_key: String, value: int) -> void:
	match status_key:
		"shield":
			_grant_shield(actor)
		"dice_minus":
			actor.grant_status("dice_minus", 1)
		"negate_negative":
			actor.grant_status("negate_negative", 1)
		"counter_shield":
			actor.grant_status("counter_shield", 1)
		_:
			push_warning("[EventManager] 未知 status：%s" % status_key)

## 授予护盾，封顶 shield_max（§3.4.5）。
func _grant_shield(actor: Node) -> void:
	if actor.get_status("shield") < _shield_max:
		actor.grant_status("shield", 1)

# ---- 交换 / 重排序（§3.4.6，瞬移，落地不触发事件） ----

## 与随机角色交换位置（排除自己与已到终点者）。
func _swap_random(actor: Node, all_pieces: Array) -> String:
	var candidates: Array = []
	for p in all_pieces:
		if p != actor and not p.is_finished():
			candidates.append(p)
	if candidates.is_empty():
		return "无可交换角色"
	var other = GameRng.pick(candidates)
	_swap_positions(actor, other)
	return "与 %s 交换位置" % other.character_name

## 与前方最近角色交换（index 更大者；无则无效，§3.4.6）。
func _swap_front(actor: Node, all_pieces: Array) -> String:
	var best: Node = null
	for p in all_pieces:
		if p == actor or p.is_finished():
			continue
		if p.current_index > actor.current_index:
			if best == null or p.current_index < best.current_index:
				best = p
	if best == null:
		return "前方无人，事件无效"
	_swap_positions(actor, best)
	return "与前方 %s 交换位置" % best.character_name

## 所有未到终点角色重新随机排序（黄眉怪布袋）。
func _reorder_all(all_pieces: Array) -> String:
	var active: Array = []
	var positions: Array = []
	for p in all_pieces:
		if not p.is_finished():
			active.append(p)
			positions.append(p.current_index)
	if active.size() < 2:
		return "可重排角色不足"
	_shuffle_with_rng(positions)  # 仅用 GameRng，保证可复现（§3.4.8）
	for i in active.size():
		active[i].snap_to(positions[i])
	_resettle_slots(all_pieces)
	return "所有角色位置被打乱重排"

## 交换两子位置（瞬移），并刷新同格槽位。
func _swap_positions(a: Node, b: Node) -> void:
	var ia: int = a.current_index
	var ib: int = b.current_index
	a.snap_to(ib)
	b.snap_to(ia)
	_resettle_slots([a, b])

## 用 GameRng 做 Fisher–Yates 洗牌（保证可复现，§3.4.8）。
func _shuffle_with_rng(arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := GameRng.randi_range(0, i)
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp

## 重排同格槽位：同格多子按出现顺序分配 0..3 槽位偏移。
func _resettle_slots(pieces: Array) -> void:
	# 简化：对传入子按当前 index 分组重设 slot（全量重排时由调用方传 all_pieces）
	var by_index: Dictionary = {}
	for p in pieces:
		var key: int = p.current_index
		if not by_index.has(key):
			by_index[key] = []
		by_index[key].append(p)
	for key in by_index.keys():
		var group: Array = by_index[key]
		for s in group.size():
			group[s].set_slot(s)

# ---- 随机负面（假佛现身） ----

## 从负面池随机抽一个负面效果并结算（§5.1 fake_buddha_random）。
func _random_negative(actor: Node, all_pieces: Array, outcome: Dictionary) -> Dictionary:
	# 负面效果池（原始效果，复用既有处理）
	var pool := ["back_2", "back_3", "stay", "dice_minus"]
	var pick := str(GameRng.pick(pool))
	outcome.note = "假佛随机：%s" % pick
	match pick:
		"back_2":
			outcome.follow_up = "event_move"
			outcome.steps = -2
		"back_3":
			outcome.follow_up = "event_move"
			outcome.steps = -3
		"stay":
			actor.add_stay(1)
			outcome.follow_up = "stay"
		"dice_minus":
			actor.grant_status("dice_minus", 1)
			outcome.follow_up = "none"
	return outcome
