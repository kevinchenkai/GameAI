extends Node
## 全局可复现随机数单例（autoload: GameRng）。
##
## 全项目统一使用此单例产生随机数，禁止散用 randi()（见 CLAUDE.md §3.3 / §8）。
## 读取 data/balance.json 的 debug_seed：为 null 时随机播种，否则固定种子以复现 bug。

const BALANCE_PATH := "res://data/balance.json"

var _rng := RandomNumberGenerator.new()
var _seed_used: int = 0

func _ready() -> void:
	var debug_seed: Variant = _load_debug_seed()
	if debug_seed == null:
		_rng.randomize()
		_seed_used = _rng.seed
	else:
		_seed_used = int(debug_seed)
		_rng.seed = _seed_used
	print("[GameRng] seed = %d (%s)" % [_seed_used, "fixed" if debug_seed != null else "random"])

## 读取 balance.json 中的 debug_seed；文件缺失或字段缺失时返回 null（随机）。
func _load_debug_seed() -> Variant:
	if not FileAccess.file_exists(BALANCE_PATH):
		push_warning("[GameRng] %s 不存在，使用随机种子" % BALANCE_PATH)
		return null
	var text := FileAccess.get_file_as_string(BALANCE_PATH)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("[GameRng] balance.json 解析失败，使用随机种子")
		return null
	return (parsed as Dictionary).get("debug_seed", null)

## 返回 [from, to] 闭区间内的随机整数。
func randi_range(from: int, to: int) -> int:
	return _rng.randi_range(from, to)

## 返回 [0.0, 1.0) 的随机浮点数。
func randf() -> float:
	return _rng.randf()

## 概率判定：以 chance（0.0–1.0）的概率返回 true。
func chance(probability: float) -> bool:
	return _rng.randf() < probability

## 从数组中等概率取一个元素；空数组返回 null。
func pick(arr: Array) -> Variant:
	if arr.is_empty():
		return null
	return arr[_rng.randi_range(0, arr.size() - 1)]

## 本局实际使用的种子（便于日志/复现）。
func get_seed() -> int:
	return _seed_used
