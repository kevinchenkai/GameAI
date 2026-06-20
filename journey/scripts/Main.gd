extends Node2D
## 程序入口场景控制器（Main.tscn 根节点）。
##
## 进入角色选择界面。流程：Main → CharacterSelect → GameScene → ResultScene → (重开)CharacterSelect。

const CHARACTER_SELECT := "res://scenes/CharacterSelect.tscn"

func _ready() -> void:
	print("[Main] entry scene ready, loading CharacterSelect...")
	get_tree().change_scene_to_file.call_deferred(CHARACTER_SELECT)
