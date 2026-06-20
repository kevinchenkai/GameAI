extends Control
## 当前回合面板（TurnPanel.tscn 根节点）。
##
## Task 4：显示当前行动角色与"玩家/AI"标记。订阅 GameManager 状态变更刷新。

@onready var _label: Label = $Label

## 设置当前行动者显示。
func show_actor(character_name: String, is_player: bool) -> void:
	if _label:
		var tag := "（你）" if is_player else "（AI）"
		_label.text = "当前回合：%s %s" % [character_name, tag]
