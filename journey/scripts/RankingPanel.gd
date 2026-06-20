extends VBoxContainer
## 排名面板（RankingPanel.tscn 根节点）。
##
## Task 7：渲染 GameManager.get_ranking() 的四方排名，胜者高亮。

const MEDALS := ["🥇", "🥈", "🥉", "4."]

## 用排名数据填充列表。rows 来自 GameManager.get_ranking()。
func render(rows: Array) -> void:
	for child in get_children():
		child.queue_free()
	for row in rows:
		add_child(_make_row(row))

func _make_row(row: Dictionary) -> Control:
	var line := Label.new()
	var rank: int = int(row.get("rank", 0))
	var medal: String = MEDALS[rank - 1] if rank >= 1 and rank <= MEDALS.size() else "%d." % rank
	var tag := ""
	if row.get("is_player", false):
		tag += "（你）"
	if row.get("is_winner", false):
		tag += " 🏆"
	line.text = "%s  %s   第 %d 格%s" % [medal, str(row.get("name", "")), int(row.get("index", 0)), tag]
	line.add_theme_font_size_override("font_size", 24 if row.get("is_winner", false) else 20)
	if row.get("is_winner", false):
		line.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	return line
