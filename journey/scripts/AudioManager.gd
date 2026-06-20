extends Node
## 音频单例（autoload: AudioManager）。
##
## 首版仅保留空接口方法签名，不接入任何音频资源（CLAUDE.md §6 / 主方案 §2.2）。

func _ready() -> void:
	pass

## 播放音效（首版空实现）。
func play_sfx(_sfx_id: String) -> void:
	pass

## 播放背景音乐（首版空实现）。
func play_bgm(_bgm_id: String) -> void:
	pass

## 停止背景音乐（首版空实现）。
func stop_bgm() -> void:
	pass
