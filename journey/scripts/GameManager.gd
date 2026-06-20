extends Node
## 游戏主状态机单例（autoload: GameManager）。
##
## Task 1：实现 §10.1 状态枚举与切换骨架，先空转、仅打印状态进入。
## 真实转移逻辑（掷骰/移动/事件/碰撞/胜利的条件回边）在 Task 4–7 接入，
## 转移图见主方案 §10.1。

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

## 状态变更信号，供 UI / 其它模块解耦订阅。
signal state_changed(from_state: State, to_state: State)

const CHARACTERS_PATH := "res://data/characters.json"

var _state: State = State.INIT
## 角色花名册（characters.json 内容），固定顺序 悟空→八戒→唐僧→沙僧。
var _roster: Array = []

func _ready() -> void:
	print("[GameManager] ready. RNG seed = %d" % GameRng.get_seed())
	_load_roster()
	change_state(State.INIT)

## 加载角色配置；失败 push_error（不静默）。
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

## 返回角色花名册（固定行动相对顺序）。
func get_roster() -> Array:
	return _roster

## 切换到目标状态，打印进入日志并广播信号。
func change_state(next: State) -> void:
	var prev := _state
	_state = next
	print("[GameManager] state: %s -> %s" % [State.keys()[prev], State.keys()[next]])
	state_changed.emit(prev, next)
	_on_enter_state(next)

## 进入状态时的占位处理（Task 1 仅打印；后续任务接入具体逻辑）。
func _on_enter_state(s: State) -> void:
	match s:
		State.INIT:
			pass
		_:
			pass

## 当前状态（只读）。
func get_state() -> State:
	return _state
