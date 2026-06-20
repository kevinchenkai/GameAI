extends Node
## AI 行动控制器（autoload? no — 场景节点，挂在 GameScene）。
##
## 职责（主方案 §10.8）：V0.1 仅自动行动，无策略决策。
## 按 §8.2 时序：等待 0.5s → 自动掷骰（移动与结束由 GameManager 驱动）。
## 思考间隔从 balance.json.ai.think_delay_sec 读取（数值不写死）。

const BALANCE_PATH := "res://data/balance.json"

var _think_delay: float = 0.5

func _ready() -> void:
	_think_delay = _load_think_delay()

func _load_think_delay() -> float:
	if not FileAccess.file_exists(BALANCE_PATH):
		return 0.5
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(BALANCE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		return 0.5
	var ai: Variant = (parsed as Dictionary).get("ai", {})
	if typeof(ai) == TYPE_DICTIONARY:
		return float((ai as Dictionary).get("think_delay_sec", 0.5))
	return 0.5

## AI 回合：思考延迟后让 dice 自动掷骰。返回 await 完成即表示已触发掷骰。
func take_turn(dice: Node) -> void:
	await get_tree().create_timer(_think_delay).timeout
	# V0.1 无策略：直接掷骰，无 dice 修正（修正由状态系统在 Task 6 接入）。
	dice.roll(0)

## 思考延迟（秒）。
func think_delay() -> float:
	return _think_delay
