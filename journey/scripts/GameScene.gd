extends Node2D
## 游戏主场景控制器（GameScene.tscn 根节点）。
##
## 生成 4 棋子 → 注入运行时（骰子/AI/棋子/弹窗）→ 以玩家所选角色开局。
## 终局切换到 ResultScene（Task 7）。

const PIECE_SCENE := preload("res://scenes/pieces/CharacterPiece.tscn")
const RESULT_SCENE := "res://scenes/ResultScene.tscn"
const START_INDEX := 1

@onready var _title: Label = $CanvasLayer/Title
@onready var _pieces_root: Node2D = $Pieces
@onready var _dice: Control = $CanvasLayer/DicePanel
@onready var _turn_panel: Control = $CanvasLayer/TurnPanel
@onready var _popup: Control = $CanvasLayer/EventPopup
@onready var _ai: Node = $AIController

var _pieces: Dictionary = {}   # character_id -> CharacterPiece

func _ready() -> void:
	if _title:
		_title.text = "Journey Ludo — V0.1（D 切换格子编号）"
	_spawn_pieces()
	GameManager.turn_started.connect(_on_turn_started)
	GameManager.game_over.connect(_on_game_over)
	GameManager.register_runtime(_dice, _ai, _pieces, _popup)
	# 以角色选择界面选定的角色开局（§3.4.7 插到首发）
	GameManager.start_game(GameManager.get_selected_player())

func _spawn_pieces() -> void:
	var roster: Array = GameManager.get_roster()
	for i in roster.size():
		var piece := PIECE_SCENE.instantiate()
		_pieces_root.add_child(piece)
		piece.setup(roster[i], START_INDEX, i)
		_pieces[String(roster[i].get("id", ""))] = piece
	print("[GameScene] 已生成 %d 个棋子于起点" % _pieces.size())

func _on_turn_started(_character_id: String, character_name: String, is_player: bool) -> void:
	if _turn_panel:
		_turn_panel.show_actor(character_name, is_player)

func _on_game_over(winner_id: String) -> void:
	var data := {}
	for c in GameManager.get_roster():
		if c.get("id", "") == winner_id:
			data = c
	if _title:
		_title.text = "🏆 胜者：%s — 游戏结束" % str(data.get("name", winner_id))
	if _dice:
		_dice.set_button_enabled(false)
	# 短暂停留展示终局位置，再进入结算界面
	await get_tree().create_timer(1.2).timeout
	get_tree().change_scene_to_file(RESULT_SCENE)

## 快捷键：D 切换棋盘编号；F11 切全屏/窗口；Esc 退出全屏。
func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_D:
			var board := get_node_or_null("Board")
			if board and board.has_method("_apply_debug_visibility"):
				board.debug_index_visible = not board.debug_index_visible
				board._apply_debug_visibility()
		KEY_F11:
			_toggle_fullscreen()
		KEY_ESCAPE:
			if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)

func _toggle_fullscreen() -> void:
	var m := DisplayServer.window_get_mode()
	if m == DisplayServer.WINDOW_MODE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
