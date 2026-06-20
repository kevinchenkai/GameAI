extends Node2D
## 程序入口场景控制器（Main.tscn 根节点）。
##
## Task 1：作为运行入口，加载并进入 GameScene，验证项目可运行、autoload 就绪。

const GAME_SCENE := preload("res://scenes/GameScene.tscn")

func _ready() -> void:
	print("[Main] entry scene ready, loading GameScene...")
	var game_scene := GAME_SCENE.instantiate()
	add_child(game_scene)
