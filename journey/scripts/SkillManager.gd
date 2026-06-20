extends Node
## 角色被动技能 hook 管线单例（autoload: SkillManager）。
##
## 职责（主方案 §10.7）：以 hook 形式介入掷骰/奖励/负面/击退/驿站结算。
## EventManager 只算原始效果，技能与护盾的修改集中在此，避免跨 Manager 硬编码判断。
##
## hook 时机：
##   on_before_dice        孙悟空筋斗云（掷 6 额外 +2）+ 应用 dice±1
##   on_reward_move        沙僧奖励 +1（移动类前进奖励）
##   on_negative_move      沙僧惩罚 -1（后退，最少 1）
##   try_negate_negative   免疫负面 > 护盾，抵消直接作用于自己的 negative 效果
##   on_knockback          八戒 50% 免疫 + 反击护盾（只结算一层）
##   on_pass_post_station  唐僧过驿站 +1 护盾（封顶）

const BALANCE_PATH := "res://data/balance.json"

# 技能/平衡数值（从 balance.json 读，代码不写死）
var _cloud_dash_bonus: int = 2
var _thick_skin_chance: float = 0.5
var _shaseng_reward_bonus: int = 1
var _shaseng_punish_reduction: int = 1
var _shield_max: int = 2
var _knockback_distance: int = 3

func _ready() -> void:
	_load_balance()

func _load_balance() -> void:
	if not FileAccess.file_exists(BALANCE_PATH):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(BALANCE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var b: Dictionary = parsed
	_shield_max = int(b.get("shield_max", 2))
	_knockback_distance = int(b.get("knockback_distance", 3))
	var sk: Dictionary = b.get("skills", {})
	_cloud_dash_bonus = int(sk.get("sun_wukong_cloud_dash_bonus", 2))
	_thick_skin_chance = float(sk.get("zhu_bajie_thick_skin_chance", 0.5))
	_shaseng_reward_bonus = int(sk.get("sha_seng_reward_bonus", 1))
	_shaseng_punish_reduction = int(sk.get("sha_seng_punish_reduction", 1))

# ---- 掷骰阶段 ----

## 计算实际移动步数：基础骰点 + dice±1（消耗状态）+ 孙悟空筋斗云。
## 返回 { steps, bubble }。
func on_before_dice(actor: Node, roll: int) -> Dictionary:
	var bubble := ""
	var value := roll
	# dice±1（消耗一层）
	if actor.get_status("dice_plus") > 0:
		actor.grant_status("dice_plus", -1)
		value = min(6, value + 1)
	if actor.get_status("dice_minus") > 0:
		actor.grant_status("dice_minus", -1)
		value = max(1, value - 1)
	# 孙悟空筋斗云：掷出 6（原始骰点）额外 +2 步
	if actor.character_id == "sun_wukong" and roll == 6:
		value += _cloud_dash_bonus
		bubble = "筋斗云！"
	return {"steps": value, "bubble": bubble}

# ---- 奖励 / 惩罚移动加成（沙僧，§6.4）----

## 移动类前进奖励：沙僧 +1。返回修正后步数。
func on_reward_move(actor: Node, steps: int) -> int:
	if actor.character_id == "sha_seng" and steps > 0:
		actor.show_bubble("稳稳向前")
		return steps + _shaseng_reward_bonus
	return steps

## 后退惩罚：沙僧 -1（最少后退 1）。steps 为负数。返回修正后步数。
func on_negative_move(actor: Node, steps: int) -> int:
	if actor.character_id == "sha_seng" and steps < 0:
		var mag: int = abs(steps) - _shaseng_punish_reduction
		mag = max(1, mag)
		return -mag
	return steps

# ---- 负面抵消（免疫负面 > 护盾，§7 / §3.4.5）----

## 尝试抵消一个直接作用于自己的 negative 效果。
## 中性位置事件（swap/reorder）不可抵消，由调用方保证只对 negative 调用。
## 返回 { negated: bool, bubble: String }。
func try_negate_negative(actor: Node) -> Dictionary:
	if actor.get_status("negate_negative") > 0:
		actor.grant_status("negate_negative", -1)
		return {"negated": true, "bubble": "免疫负面！"}
	if actor.get_status("shield") > 0:
		actor.grant_status("shield", -1)
		return {"negated": true, "bubble": "护盾抵消！"}
	return {"negated": false, "bubble": ""}

# ---- 击退（§3.4.4 / §3.4.5）----

## 结算击退：attacker 踩中 target。返回 {
##   target_back: int  (target 应后退的格数，0 表示未被击退),
##   attacker_back: int(反击护盾让 attacker 后退的格数，0 表示无),
##   bubble: String    (target 的气泡，如八戒台词)
## }
func on_knockback(target: Node, _attacker: Node) -> Dictionary:
	var result := {"target_back": _knockback_distance, "attacker_back": 0, "bubble": ""}
	# 八戒皮糙肉厚：50% 免疫击退
	if target.character_id == "zhu_bajie" and GameRng.chance(_thick_skin_chance):
		result.target_back = 0
		result.bubble = "嘿嘿，俺老猪站得稳！"
		return result
	# 免疫负面 > 护盾 抵消击退
	var neg := try_negate_negative(target)
	if neg.negated:
		result.target_back = 0
		result.bubble = neg.bubble
		return result
	# 反击护盾：让攻击者后退（只结算一层，不互弹，§3.4.5）
	if target.get_status("counter_shield") > 0:
		target.grant_status("counter_shield", -1)
		result.target_back = 0
		result.attacker_back = _knockback_distance
		result.bubble = "反击护盾！"
	return result

# ---- 驿站（唐僧，§6.3）----

## 经过驿站：唐僧 +1 护盾（封顶 shield_max）。
func on_pass_post_station(actor: Node) -> void:
	if actor.character_id == "tang_seng":
		if actor.get_status("shield") < _shield_max:
			actor.grant_status("shield", 1)
			actor.show_bubble("佛光护体")

func shield_max() -> int:
	return _shield_max

func knockback_distance() -> int:
	return _knockback_distance
