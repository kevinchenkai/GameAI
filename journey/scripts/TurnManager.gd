extends Node
## 回合与行动顺序单例（autoload: TurnManager）。
##
## 职责（主方案 §10.2）：维护行动顺序、跳过停留回合、切换下一角色。
## 固定相对顺序 悟空→八戒→唐僧→沙僧 循环；玩家所选角色插到首发（§3.4.7）。

## 基础相对顺序（character_id）。
const BASE_ORDER := ["sun_wukong", "zhu_bajie", "tang_seng", "sha_seng"]

## 本局行动顺序（character_id 列表，玩家角色在首位）。
var _order: Array[String] = []
## 当前行动者在 _order 中的下标。
var _cursor: int = -1
## 玩家所控角色 id。
var _player_id: String = ""

## 以玩家所选角色构建本局顺序：玩家插到首发，其余按基础相对顺序跟随。
func setup(player_id: String) -> void:
	_player_id = player_id
	_order.clear()
	_order.append(player_id)
	for cid in BASE_ORDER:
		if cid != player_id:
			_order.append(cid)
	_cursor = -1
	print("[TurnManager] 行动顺序：%s（玩家=%s）" % [str(_order), player_id])

## 推进到下一个行动者并返回其 character_id。
func advance() -> String:
	_cursor = (_cursor + 1) % _order.size()
	return _order[_cursor]

## 当前行动者 character_id（未开始返回空串）。
func current_id() -> String:
	if _cursor < 0 or _order.is_empty():
		return ""
	return _order[_cursor]

## 是否为玩家所控角色。
func is_player(character_id: String) -> bool:
	return character_id == _player_id

## 行动顺序列表（只读）。
func get_order() -> Array[String]:
	return _order
