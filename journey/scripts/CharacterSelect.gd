extends Control
## 角色选择界面（CharacterSelect.tscn 根节点）。
##
## S2：背景 select_bg；4 张卡片按 brief 预留坐标定位到背景的 4 个光台上。
## 玩家选 1 角色（其余 AI），选定后存入 GameManager 并进入 GameScene。

const GAME_SCENE := "res://scenes/GameScene.tscn"

## 4 卡片中心 x / 中心 y。对齐实机 select_bg 底部 4 个祥云圆台预留位，
## S5 经实机手工微调定稿（整体右移+下移踩稳云台；标题在 .tscn 中左上居中）。
const CARD_CENTERS_X := [550.0, 840.0, 1160.0, 1460.0]
const CARD_CENTER_Y := 650.0
const CARD_SIZE := Vector2(280.0, 400.0)
const AVATAR_SIZE := Vector2(180.0, 180.0)

@onready var _cards_root: Control = $Cards

func _ready() -> void:
	AudioManager.play_bgm("bgm_select")
	_build_cards()

func _build_cards() -> void:
	for child in _cards_root.get_children():
		child.queue_free()
	var roster: Array = GameManager.get_roster()
	for i in roster.size():
		var center_x: float = CARD_CENTERS_X[i] if i < CARD_CENTERS_X.size() else 480.0 + i * 320.0
		var card := _make_card(roster[i])
		card.position = Vector2(center_x - CARD_SIZE.x * 0.5, CARD_CENTER_Y - CARD_SIZE.y * 0.5)
		_cards_root.add_child(card)

func _make_card(data: Dictionary) -> Control:
	var card := VBoxContainer.new()
	card.custom_minimum_size = CARD_SIZE
	card.size = CARD_SIZE
	card.add_theme_constant_override("separation", 10)

	var avatar := TextureRect.new()
	avatar.custom_minimum_size = AVATAR_SIZE
	avatar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	avatar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	avatar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var avatar_path := str(data.get("avatar", ""))
	if avatar_path != "" and ResourceLoader.exists(avatar_path):
		avatar.texture = load(avatar_path)
	card.add_child(avatar)

	var name_label := Label.new()
	name_label.text = str(data.get("name", ""))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 26)
	name_label.add_theme_color_override("font_color", Color(0.35, 0.22, 0.08))
	card.add_child(name_label)

	var role_label := Label.new()
	role_label.text = _role_text(str(data.get("passive_skill", "")))
	role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	role_label.add_theme_font_size_override("font_size", 15)
	role_label.add_theme_color_override("font_color", Color(0.4, 0.3, 0.15))
	role_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	role_label.custom_minimum_size = Vector2(CARD_SIZE.x, 50)
	card.add_child(role_label)

	var btn := Button.new()
	btn.text = "选择"
	btn.custom_minimum_size = Vector2(160, 52)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	ButtonStyle.apply(btn, 22)
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
	AudioManager.play_sfx("sfx_click")
	GameManager.set_selected_player(character_id)
	get_tree().change_scene_to_file(GAME_SCENE)
