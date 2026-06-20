extends Control
## 事件弹窗（EventPopup.tscn 根节点）。
##
## Task 5：显示事件名/描述/附加说明，短暂停留后自动关闭并发 closed。
## GameManager 在结算事件时调用 show_event() 并 await closed，保证弹窗节奏。

signal closed()

const SHOW_TIME := 1.1

const ICON_FMT := "res://assets/sprites/effects/event_%s.png"

@onready var _panel: Panel = $Panel
@onready var _icon: TextureRect = $Panel/Icon
@onready var _name: Label = $Panel/Name
@onready var _desc: Label = $Panel/Desc
@onready var _note: Label = $Panel/Note

func _ready() -> void:
	visible = false

## 展示一个事件；duration 秒后自动关闭。outcome 来自 EventManager.resolve()。
func show_event(outcome: Dictionary) -> void:
	if _icon:
		var path := ICON_FMT % str(outcome.get("event_id", ""))
		if ResourceLoader.exists(path):
			_icon.texture = load(path)
			_icon.visible = true
		else:
			_icon.visible = false
	if _name:
		_name.text = str(outcome.get("name", ""))
	if _desc:
		_desc.text = str(outcome.get("description", ""))
	if _note:
		var note := str(outcome.get("note", ""))
		_note.text = note
		_note.visible = note != ""
	visible = true
	await get_tree().create_timer(SHOW_TIME).timeout
	visible = false
	closed.emit()
