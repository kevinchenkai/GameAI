extends Node2D
## 棋盘视图（Board.tscn 根节点）。
##
## Task 2：依据 BoardManager 已校验的数据，实例化 72 个 Tile 占位格。
## 提供调试编号显示开关（默认开，可用 D 键切换）。

const TILE_SCENE := preload("res://scenes/board/Tile.tscn")

@export var debug_index_visible: bool = true

var _tiles: Array[Node2D] = []

func _ready() -> void:
	if not BoardManager.is_loaded():
		push_error("[Board] BoardManager 数据未就绪，无法生成棋盘")
		return
	_build_tiles()
	_apply_debug_visibility()
	print("[Board] 已生成 %d 个格子" % _tiles.size())

## 实例化 72 个格子并定位。
func _build_tiles() -> void:
	for index in range(1, BoardManager.TILE_COUNT + 1):
		var tile := TILE_SCENE.instantiate()
		add_child(tile)
		tile.setup(index, BoardManager.get_tile_type(index), BoardManager.get_tile_position(index))
		_tiles.append(tile)

func _apply_debug_visibility() -> void:
	for tile in _tiles:
		tile.set_debug_index_visible(debug_index_visible)

## 调试：D 键切换格子编号显示。
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_D:
		debug_index_visible = not debug_index_visible
		_apply_debug_visibility()
