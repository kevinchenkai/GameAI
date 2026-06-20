extends Control
## 骰子面板控制器（DicePanel.tscn 根节点）。
##
## 职责（主方案 §10.3）：骰子按钮、用 GameRng 生成 1–6、骰子动画、
## 应用 dice_plus / dice_minus 修正（夹在 1–6）。

## 掷骰完成发出最终点数（已含修正、已夹取）。
signal rolled(value: int)

const ROLL_ANIM_FRAMES := 10
const ROLL_ANIM_INTERVAL := 0.04
const DICE_FACE_FMT := "res://assets/sprites/ui/dice_%d.png"

@onready var _button: Button = $RollButton
@onready var _result: Label = $Result
@onready var _face: TextureRect = $Face

var _rolling: bool = false
var _faces: Array = []  # 1..6 对应纹理（index 0 占位）

func _ready() -> void:
	_load_faces()
	if _button:
		_button.pressed.connect(_on_button_pressed)
	set_button_enabled(false)

func _load_faces() -> void:
	_faces = [null]
	for n in range(1, 7):
		var path := DICE_FACE_FMT % n
		_faces.append(load(path) if ResourceLoader.exists(path) else null)

## 显示某个骰面（有纹理用图，否则用数字）。
func _show_face(value: int) -> void:
	if _face and value >= 1 and value <= 6 and _faces[value] != null:
		_face.texture = _faces[value]
		_face.visible = true
		if _result:
			_result.visible = false
	elif _result:
		_result.text = str(value)
		_result.visible = true

## 启用/禁用掷骰按钮（玩家回合启用，AI 回合禁用）。
func set_button_enabled(v: bool) -> void:
	if _button:
		_button.disabled = not v
		_button.visible = true

func _on_button_pressed() -> void:
	roll(0)

## 掷骰：base 为 GameRng 1–6，叠加 modifier（dice_plus=+1 / dice_minus=-1），
## 结果夹在 1–6。播放滚动动画后发 rolled 信号。modifier 由调用方按状态传入。
func roll(modifier: int) -> void:
	if _rolling:
		return
	_rolling = true
	set_button_enabled(false)
	# 滚动动画：连续显示随机面
	for i in ROLL_ANIM_FRAMES:
		_show_face(GameRng.randi_range(1, 6))
		await get_tree().create_timer(ROLL_ANIM_INTERVAL).timeout
	var base: int = GameRng.randi_range(1, 6)
	var value: int = clampi(base + modifier, 1, 6)
	_show_face(value)
	_rolling = false
	rolled.emit(value)
