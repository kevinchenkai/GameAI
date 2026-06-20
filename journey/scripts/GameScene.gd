extends Node2D
## 游戏主场景控制器（GameScene.tscn 根节点）。
##
## Task 1：占位空场景。Task 2：挂载棋盘。
## Task 3：在起点生成 4 个角色棋子（四角偏移），提供逐格移动验证。
## 真实回合/掷骰在 Task 4 接入；本任务用空格键做移动 demo。

const PIECE_SCENE := preload("res://scenes/pieces/CharacterPiece.tscn")
const START_INDEX := 1

@onready var _title: Label = $CanvasLayer/Title
@onready var _pieces_root: Node2D = $Pieces

var _pieces: Array[Node2D] = []
var _demo_turn: int = 0  # demo：轮流移动哪个棋子

func _ready() -> void:
	print("[GameScene] ready. GameManager state = %s" % GameManager.State.keys()[GameManager.get_state()])
	if _title:
		_title.text = "Journey Ludo — V0.1 (Task 3：空格掷骰移动 / D 切换编号)"
	_spawn_pieces()

## 在起点生成全部角色棋子，按花名册顺序分配四角槽位。
func _spawn_pieces() -> void:
	var roster: Array = GameManager.get_roster()
	for i in roster.size():
		var piece := PIECE_SCENE.instantiate()
		_pieces_root.add_child(piece)
		piece.setup(roster[i], START_INDEX, i)
		_pieces.append(piece)
	print("[GameScene] 已生成 %d 个棋子于起点" % _pieces.size())

## Demo：空格键让下一个棋子掷一次骰子并逐格前进，验证移动动画。
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE:
		_demo_move()

func _demo_move() -> void:
	if _pieces.is_empty():
		return
	var piece: Node2D = _pieces[_demo_turn % _pieces.size()]
	if piece.is_moving():
		return
	var roll: int = GameRng.randi_range(1, 6)
	print("[Demo] %s 掷出 %d，从第 %d 格出发" % [piece.character_name, roll, piece.current_index])
	_demo_turn += 1
	await piece.move_by(roll)
	print("[Demo] %s 停在第 %d 格" % [piece.character_name, piece.current_index])
