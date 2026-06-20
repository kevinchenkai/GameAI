extends Node
## 棋盘数据与坐标单例（autoload: BoardManager）。
##
## 职责（主方案 §10.4）：加载 board_72.json、校验事件引用、生成 72 格坐标、
## 提供路径与事件查询。
##
## 数据校验前置（CLAUDE.md §3.5）：每个非空 event_id 必须存在于 events.json，
## 否则 push_error 中止——禁止运行时静默失败。

const BOARD_PATH := "res://data/board_72.json"
const EVENTS_PATH := "res://data/events.json"
const PATH_TABLE := "res://data/board_path.json"

const TILE_COUNT := 72

## 设计分辨率（与底图 board_map.png 同比，坐标基准）。归一化点 × 此尺寸 = 画布坐标。
## 实际屏幕缩放由 project.godot 的 canvas_items/keep 处理，与此无关。
const DESIGN_SIZE := Vector2(1920.0, 1080.0)

## 蛇形 fallback 参数（仅当 board_path.json 缺失时退回，保证可跑）。
const COLS := 9
const ORIGIN := Vector2(140.0, 120.0)
const SPACING := Vector2(120.0, 120.0)

## index(1..72) -> 格子数据字典 { index, region, tile_type, event_id }
var _tiles: Dictionary = {}
## index(1..72) -> Vector2 画布坐标
var _positions: Dictionary = {}
## index(1..72) -> Vector2 归一化坐标（来自 board_path.json）
var _norm: Dictionary = {}
## 是否使用取经路点位表（false 则退回蛇形 fallback）
var _use_path_table: bool = false
## 数据是否已成功加载并通过校验
var _loaded: bool = false

func _ready() -> void:
	_load_path_table()
	_load_and_validate()

## 加载棋盘与事件数据并交叉校验。任一环节失败 push_error 并中止（不静默）。
func _load_and_validate() -> void:
	var board: Variant = _load_json_array(BOARD_PATH)
	var events: Variant = _load_json_array(EVENTS_PATH)
	if board == null or events == null:
		return

	# 收集合法 event_id 集合
	var valid_event_ids := {}
	for e in events:
		if typeof(e) == TYPE_DICTIONARY and e.has("id"):
			valid_event_ids[e["id"]] = true

	# 校验格子数量
	if board.size() != TILE_COUNT:
		push_error("[BoardManager] board_72.json 应有 %d 格，实际 %d 格，加载中止" % [TILE_COUNT, board.size()])
		return

	var seen_index := {}
	for tile in board:
		if typeof(tile) != TYPE_DICTIONARY:
			push_error("[BoardManager] 存在非对象格子条目，加载中止")
			return
		var idx: int = int(tile.get("index", -1))
		if idx < 1 or idx > TILE_COUNT:
			push_error("[BoardManager] 非法 index=%s，加载中止" % str(tile.get("index")))
			return
		if seen_index.has(idx):
			push_error("[BoardManager] 重复 index=%d，加载中止" % idx)
			return
		seen_index[idx] = true

		# 核心校验：非空 event_id 必须存在于 events.json
		var eid: Variant = tile.get("event_id", null)
		if eid != null and not valid_event_ids.has(eid):
			push_error("[BoardManager] 第 %d 格 event_id '%s' 不存在于 events.json，加载中止" % [idx, str(eid)])
			return

		_tiles[idx] = tile
		_positions[idx] = _compute_position(idx)

	if seen_index.size() != TILE_COUNT:
		push_error("[BoardManager] index 不连续（缺格），加载中止")
		return

	_loaded = true
	print("[BoardManager] 已加载并校验 %d 格，事件引用全部有效" % TILE_COUNT)

## 加载取经路点位表 board_path.json，并校验（72 条、index 连续、x/y∈[0,1]）。
## 任一不满足 push_error 并退回蛇形 fallback（不静默）。
func _load_path_table() -> void:
	if not FileAccess.file_exists(PATH_TABLE):
		push_warning("[BoardManager] 缺少 %s，退回蛇形布局" % PATH_TABLE)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH_TABLE))
	if typeof(parsed) != TYPE_ARRAY or (parsed as Array).size() != TILE_COUNT:
		push_error("[BoardManager] board_path.json 非数组或数量≠%d，退回蛇形布局" % TILE_COUNT)
		return
	var seen := {}
	for p in parsed:
		if typeof(p) != TYPE_DICTIONARY:
			push_error("[BoardManager] board_path.json 含非对象条目，退回蛇形布局")
			return
		var idx: int = int(p.get("index", -1))
		var x: float = float(p.get("x", -1.0))
		var y: float = float(p.get("y", -1.0))
		if idx < 1 or idx > TILE_COUNT or seen.has(idx):
			push_error("[BoardManager] board_path.json 非法/重复 index=%s，退回蛇形布局" % str(idx))
			return
		if x < 0.0 or x > 1.0 or y < 0.0 or y > 1.0:
			push_error("[BoardManager] board_path.json 第 %d 点坐标越界 [0,1]，退回蛇形布局" % idx)
			return
		seen[idx] = true
		_norm[idx] = Vector2(x, y)
	if seen.size() != TILE_COUNT:
		push_error("[BoardManager] board_path.json index 不连续，退回蛇形布局")
		return
	_use_path_table = true
	print("[BoardManager] 已加载取经路点位表 %d 点" % TILE_COUNT)

## 计算格子画布坐标：优先取经路点位表（归一化×设计分辨率），否则蛇形 fallback。
func _compute_position(index: int) -> Vector2:
	if _use_path_table and _norm.has(index):
		var n: Vector2 = _norm[index]
		return Vector2(n.x * DESIGN_SIZE.x, n.y * DESIGN_SIZE.y)
	# fallback：蛇形（boustrophedon）排布
	var i := index - 1
	var row := i / COLS
	var col_in_row := i % COLS
	var col := col_in_row if (row % 2 == 0) else (COLS - 1 - col_in_row)
	return ORIGIN + Vector2(col * SPACING.x, row * SPACING.y)

## 读取 JSON 数组文件；失败返回 null 并 push_error。
func _load_json_array(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("[BoardManager] 文件不存在：%s" % path)
		return null
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_ARRAY:
		push_error("[BoardManager] %s 不是合法 JSON 数组" % path)
		return null
	return parsed

# ---- 查询 API ----

## 数据是否就绪。
func is_loaded() -> bool:
	return _loaded

## 取指定格子的屏幕坐标；越界返回 ORIGIN。
func get_tile_position(index: int) -> Vector2:
	return _positions.get(index, ORIGIN)

## 取指定格子的完整数据字典；不存在返回空字典。
func get_tile(index: int) -> Dictionary:
	return _tiles.get(index, {})

## 取指定格子的 event_id；无事件返回 null。
func get_event_id(index: int) -> Variant:
	var t: Dictionary = _tiles.get(index, {})
	return t.get("event_id", null)

## 取指定格子的类型（normal/reward/punish/warp/post_station/special/start/finish）。
func get_tile_type(index: int) -> String:
	var t: Dictionary = _tiles.get(index, {})
	return str(t.get("tile_type", "normal"))

## 是否为驿站格（唐僧护盾判定点）。
func is_post_station(index: int) -> bool:
	return get_tile_type(index) == "post_station"

## 返回从 from_index 走 steps 步的逐格路径（含落点，夹在 1..72）。
## steps 为正前进、为负后退。供棋子逐格移动动画使用。
## 注意：不可命名为 get_path，会与 Node.get_path() 冲突。
func get_move_path(from_index: int, steps: int) -> Array[int]:
	var path: Array[int] = []
	var step_dir: int = 1 if steps >= 0 else -1
	var remaining: int = abs(steps)
	var cur: int = from_index
	while remaining > 0:
		cur = clampi(cur + step_dir, 1, TILE_COUNT)
		path.append(cur)
		if cur == 1 or cur == TILE_COUNT:
			break  # 触底/触顶，停止
		remaining -= 1
	return path
