extends Control
## 角色选择界面（CharacterSelect.tscn 根节点）。
##
## Task 7：玩家从 4 角色中选 1（其余 AI）。选定后存入 GameManager 并进入 GameScene。
## Task 8：卡片用角色头像素材。

const GAME_SCENE := "res://scenes/GameScene.tscn"
const AVATAR_SIZE := Vector2(160, 160)

@onready var _cards_root: HBoxContainer = $Center/Cards

func _ready() -> void:
	_build_cards()


func _build_cards() -> void:
	for child in _cards_root.get_children():
		child.queue_free()
	for data in GameManager.get_roster():
		_cards_root.add_child(_make_card(data))

func _make_card(data: Dictionary) -> Control:
	var card := VBoxContainer.new()
	card.custom_minimum_size = Vector2(200, 280)

	var avatar := TextureRect.new()
	avatar.custom_minimum_size = AVATAR_SIZE
	avatar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	avatar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var avatar_path := str(data.get("avatar", ""))
	if avatar_path != "" and ResourceLoader.exists(avatar_path):
		avatar.texture = load(avatar_path)
	card.add_child(avatar)

	var name_label := Label.new()
	name_label.text = str(data.get("name", ""))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 22)
	card.add_child(name_label)

	var role_label := Label.new()
	role_label.text = _role_text(str(data.get("passive_skill", "")))
	role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	role_label.add_theme_font_size_override("font_size", 14)
	role_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(role_label)

	var btn := Button.new()
	btn.text = "选择 %s" % str(data.get("name", ""))
	var cid := str(data.get("id", ""))
	btn.pressed.connect(func(): _on_select(cid))
	card.add_child(btn)

	return card

func _role_text(skill: String) -> String:
	match skill:
		"cloud_dash": return "筋斗云：掷6额外+2格"
		"thick_skin": return "皮糙肉厚：50%抗击退"
		"buddha_light": return "佛光护体：过驿站得护盾"
		"steady_walk": return "踏实前行：奖励+1/惩罚-1"
		_: return ""

func _on_select(character_id: String) -> void:
	GameManager.set_selected_player(character_id)
	get_tree().change_scene_to_file(GAME_SCENE)
