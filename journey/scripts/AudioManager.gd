extends Node
## 音频单例（autoload: AudioManager）。
##
## S4：实装 BGM + SFX 播放。数据驱动（data/audio.json 映射 id→路径/音量），
## 音量/静音入 balance.json.audio（无 UI）。缺资源静默降级（push_warning 不崩）。
##
## - BGM：单个 AudioStreamPlayer，循环 + 淡入淡出切段。
## - SFX：播放器池（轮转），避免同时多音互相打断；sfx_step 做连发节流。
## - 全部声音由各场景/GameManager 消费信号时调用，逻辑零侵入（见 docs/UPGRADE_S4_AUDIO.md §4）。

const AUDIO_CONFIG := "res://data/audio.json"
const BALANCE_PATH := "res://data/balance.json"
const SFX_POOL_SIZE := 4

# 从 audio.json 读入：id -> { stream, volume_db }
var _bgm_defs: Dictionary = {}
var _sfx_defs: Dictionary = {}

# balance.audio 音量/开关
var _bgm_volume_db: float = -8.0
var _sfx_volume_db: float = -2.0
var _muted: bool = false
var _bgm_fade_sec: float = 0.6
var _step_min_interval_sec: float = 0.08

# 运行时
var _bgm_player: AudioStreamPlayer = null
var _sfx_pool: Array[AudioStreamPlayer] = []
var _sfx_cursor: int = 0
var _current_bgm_id: String = ""
var _last_step_ms: int = 0

func _ready() -> void:
	_load_balance_audio()
	_load_config()
	_build_players()

# ---- 配置加载 ----

func _load_balance_audio() -> void:
	if not FileAccess.file_exists(BALANCE_PATH):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(BALANCE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var a: Dictionary = (parsed as Dictionary).get("audio", {})
	_bgm_volume_db = float(a.get("bgm_volume_db", _bgm_volume_db))
	_sfx_volume_db = float(a.get("sfx_volume_db", _sfx_volume_db))
	_muted = bool(a.get("muted", false))
	_bgm_fade_sec = float(a.get("bgm_fade_sec", _bgm_fade_sec))
	_step_min_interval_sec = float(a.get("step_min_interval_sec", _step_min_interval_sec))

func _load_config() -> void:
	if not FileAccess.file_exists(AUDIO_CONFIG):
		push_warning("[AudioManager] 缺少 %s，音频全部静默降级" % AUDIO_CONFIG)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(AUDIO_CONFIG))
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("[AudioManager] audio.json 非法，音频静默降级")
		return
	var cfg: Dictionary = parsed
	_bgm_defs = _load_group(cfg.get("bgm", {}))
	_sfx_defs = _load_group(cfg.get("sfx", {}))
	print("[AudioManager] 已加载 %d BGM + %d SFX" % [_bgm_defs.size(), _sfx_defs.size()])

## 把 { id: {path, volume_db} } 解析为 { id: {stream, volume_db} }；缺文件跳过并 warning。
func _load_group(group: Variant) -> Dictionary:
	var out: Dictionary = {}
	if typeof(group) != TYPE_DICTIONARY:
		return out
	for id in (group as Dictionary).keys():
		var entry: Dictionary = group[id]
		var path: String = str(entry.get("path", ""))
		if path == "" or not ResourceLoader.exists(path):
			push_warning("[AudioManager] 音频缺失，跳过：%s (%s)" % [str(id), path])
			continue
		var stream: AudioStream = load(path)
		if stream == null:
			push_warning("[AudioManager] 音频加载失败，跳过：%s" % str(id))
			continue
		out[str(id)] = { "stream": stream, "volume_db": float(entry.get("volume_db", 0.0)) }
	return out

func _build_players() -> void:
	_bgm_player = AudioStreamPlayer.new()
	_bgm_player.name = "BgmPlayer"
	add_child(_bgm_player)
	for i in SFX_POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.name = "SfxPlayer%d" % i
		add_child(p)
		_sfx_pool.append(p)

# ---- 公共 API ----

## 播放音效（短促，一次性）。id 见 data/audio.json.sfx。缺/静音则无声。
func play_sfx(sfx_id: String) -> void:
	if _muted:
		return
	var def: Dictionary = _sfx_defs.get(sfx_id, {})
	if def.is_empty():
		return  # 静默降级
	var player: AudioStreamPlayer = _sfx_pool[_sfx_cursor]
	_sfx_cursor = (_sfx_cursor + 1) % _sfx_pool.size()
	player.stream = def["stream"]
	player.volume_db = _sfx_volume_db + float(def["volume_db"])
	player.play()

## 播放脚步音效（节流：两次最少间隔 step_min_interval_sec，避免逐格连发炸耳）。
func play_step() -> void:
	var now: int = Time.get_ticks_msec()
	if now - _last_step_ms < int(_step_min_interval_sec * 1000.0):
		return
	_last_step_ms = now
	play_sfx("sfx_step")

## 播放背景音乐（循环）。切到不同段时淡出旧、淡入新；同段不重启。
func play_bgm(bgm_id: String) -> void:
	if _bgm_player == null:
		return
	if bgm_id == _current_bgm_id and _bgm_player.playing:
		return
	var def: Dictionary = _bgm_defs.get(bgm_id, {})
	if def.is_empty():
		_current_bgm_id = bgm_id  # 记下意图，资源缺则静默
		return
	_current_bgm_id = bgm_id
	var target_db: float = _bgm_volume_db + float(def["volume_db"])
	var new_stream: AudioStream = def["stream"]
	_set_stream_loop(new_stream, true)
	if _bgm_player.playing and _bgm_fade_sec > 0.0:
		await _fade_to(_bgm_player, -40.0, _bgm_fade_sec)
	_bgm_player.stream = new_stream
	_bgm_player.volume_db = (-40.0 if _bgm_fade_sec > 0.0 and not _muted else target_db)
	if _muted:
		return
	_bgm_player.play()
	if _bgm_fade_sec > 0.0:
		await _fade_to(_bgm_player, target_db, _bgm_fade_sec)

## 停止背景音乐（淡出）。
func stop_bgm() -> void:
	if _bgm_player == null or not _bgm_player.playing:
		return
	if _bgm_fade_sec > 0.0:
		await _fade_to(_bgm_player, -40.0, _bgm_fade_sec)
	_bgm_player.stop()
	_current_bgm_id = ""

## 静音开关（无 UI；供将来挂钮或调试调用）。
func set_muted(v: bool) -> void:
	_muted = v
	if _muted and _bgm_player and _bgm_player.playing:
		_bgm_player.stop()
	elif not _muted and _current_bgm_id != "":
		play_bgm(_current_bgm_id)

func is_muted() -> bool:
	return _muted

# ---- 工具 ----

## 让 OGG/WAV 流循环（BGM 用）。
func _set_stream_loop(stream: AudioStream, enable: bool) -> void:
	if stream is AudioStreamOggVorbis:
		(stream as AudioStreamOggVorbis).loop = enable
	elif stream is AudioStreamWAV:
		(stream as AudioStreamWAV).loop_mode = (AudioStreamWAV.LOOP_FORWARD if enable else AudioStreamWAV.LOOP_DISABLED)

## 在 dur 秒内把 player 音量线性渐变到 to_db。
func _fade_to(player: AudioStreamPlayer, to_db: float, dur: float) -> void:
	var tween := create_tween()
	tween.tween_property(player, "volume_db", to_db, dur)
	await tween.finished
