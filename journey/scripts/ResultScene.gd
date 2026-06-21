extends Control
## 结算界面（ResultScene.tscn 根节点）。
##
## Task 7：显示胜者与四方排名，提供重新开始（回到角色选择）。

const SELECT_SCENE := "res://scenes/CharacterSelect.tscn"

@onready var _winner_label: Label = $Winner
@onready var _winner_avatar: TextureRect = $Avatar
@onready var _ranking: VBoxContainer = $RankingPanel
@onready var _restart: Button = $RestartButton

func _ready() -> void:
	AudioManager.play_bgm("bgm_result")
	var winner_id := GameManager.get_winner()
	var data := _find(winner_id)
	if _winner_label:
		_winner_label.text = "🏆 %s 抵达西天，取经成功！" % str(data.get("name", winner_id))
	var avatar_path := str(data.get("avatar", ""))
	if _winner_avatar and avatar_path != "" and ResourceLoader.exists(avatar_path):
		_winner_avatar.texture = load(avatar_path)
	if _ranking:
		_ranking.render(GameManager.get_ranking())
	if _restart:
		ButtonStyle.apply(_restart, 26)
		_restart.pressed.connect(_on_restart)

func _find(cid: String) -> Dictionary:
	for c in GameManager.get_roster():
		if c.get("id", "") == cid:
			return c
	return {}

func _on_restart() -> void:
	AudioManager.play_sfx("sfx_click")
	get_tree().change_scene_to_file(SELECT_SCENE)
