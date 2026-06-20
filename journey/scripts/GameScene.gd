extends Node2D
## 游戏主场景控制器（GameScene.tscn 根节点）。
##
## Task 1：占位空场景，显示一行标题，证明可运行。
## Task 2：挂载棋盘（Board），展示 72 格占位。后续挂棋子、UI 等。

@onready var _title: Label = $CanvasLayer/Title

func _ready() -> void:
	print("[GameScene] ready. GameManager state = %s" % GameManager.State.keys()[GameManager.get_state()])
	if _title:
		_title.text = "Journey Ludo — V0.1 (Task 2 棋盘，按 D 切换编号)"
