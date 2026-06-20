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

var _state: State = State.INIT

func _ready() -> void:
	print("[GameManager] ready. RNG seed = %d" % GameRng.get_seed())
	change_state(State.INIT)

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
