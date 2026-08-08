/**
 * game/pet/reactionResolver.ts —— ★ 单一决策入口（冻结契约 3）
 *
 * 这个文件很短，但它是宠物系统的全部规则所在。
 * **优先级写成一串 if 而不是散落各处**，是为了让"赢了就不该再放技能"
 * 这类规则一眼可验证。
 */

import { COMBO_EXCITED_THRESHOLD } from '../../config/tuning';
import type { CoreTurnSummary } from '../../core/types';
import type { PetRuntimeState } from './state';
import type { PetState } from './state';

/**
 * ★ `skillOffer` ≠ `skill`（复查 §1.3）。V1.1 初稿把它们混成一个状态是错的：
 *
 *   | 阶段        | 含义                          | 棋盘       |
 *   | skillOffer  | 1.5s 可点击窗口，宠物发光待命 | **未改变** |
 *   | skill       | 技能动画 + Action 已开始      | **正在变** |
 *
 *   分开的价值：窗口期棋盘没变，**可以安全取消**（比如玩家此时暂停）；
 *   一旦进入 skill 就是不可回退的棋盘变更。
 *   混成一个状态会让"取消"语义无处安放。
 */
export type PetDecision =
  | { readonly type: 'reaction'; readonly state: PetState }
  | { readonly type: 'skillOffer' };

/**
 * ★ 同时吃两份输入：Core 给的回合结果 + Pet 自己的状态（PATCH A）。
 *
 * 优先级 `Victory > Pet Skill > Big Combo > Hint` 的直接编码。
 * 顺序即优先级，**不要重排这些 if**。
 */
export function resolvePetDecision(
  turn: CoreTurnSummary, // 来自 core：只有棋盘 / 关卡信息
  pet: PetRuntimeState, // 来自 pet 层：能量、就绪
): PetDecision {
  if (turn.result === 'win') return { type: 'reaction', state: 'victory' };
  if (turn.result === 'lose') return { type: 'reaction', state: 'encourage' };
  // ★ 是 skillOffer 而不是 skill —— 此时棋盘还没变
  if (pet.skillReady) return { type: 'skillOffer' };
  if (turn.maxCascade >= COMBO_EXCITED_THRESHOLD) return { type: 'reaction', state: 'excited' };
  return { type: 'reaction', state: 'idle' };
}

/**
 * ★ 四条硬规则，不许违反：
 *
 *   1. 轻反应**永不阻塞**棋盘推进
 *   2. 重反应**只在 turnResolved**，一段连锁最多一次
 *   3. 宠物 Gameplay Action **绝不插入 Cascade**
 *   4. 宠物**永不消费裸 `settled`** —— 那时胜负还未知
 *
 * 完整链路（Stage 0.5）：
 *   turnResolved → skillOffer → 1.5s 窗口（点击 or 超时）
 *   → PetSkillRequested → PetActionCommand → core.applyPetAction()
 *   → PetState = 'skill' + CoreGameEvent[] 播放
 */
