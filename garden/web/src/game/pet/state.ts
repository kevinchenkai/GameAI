/**
 * game/pet/state.ts —— 宠物 runtime
 *
 * ★ PATCH A：这些字段**属于 Pet 层，core/ 看不见**。
 *   V1.1 初稿把 `petSkillReady` 放进 CoreTurnSummary，
 *   与「core 不认识旺财」的冻结契约直接矛盾——Core 凭什么知道
 *   宠物技能好没好？已移到这里。
 */

export type PetState =
  | 'idle' // 待机：呼吸、偶尔眨眼、摇尾巴（Puppet 合成，不需要整图）
  | 'watching' // 玩家操作中：看向棋盘
  | 'happy' // 轻反应：小幅开心
  | 'excited' // 重反应：跳跃欢呼（大 Combo）
  | 'thinking' // 玩家停顿 3s：歪头思考
  | 'hint' // 玩家停顿 5s：跑向提示方向
  | 'skill' // 释放技能（Stage 0.5）
  | 'encourage' // 濒临失败 / 失败
  | 'victory'; // 通关庆祝

export interface PetRuntimeState {
  readonly energy: number;
  readonly maxEnergy: number;
  /** ★ 技能就绪属于 Pet 层，不属于 CoreTurnSummary */
  readonly skillReady: boolean;
  readonly state: PetState;
}

/** Stage 0 不做能量与技能，skillReady 恒为 false */
export function createPetRuntime(maxEnergy: number): PetRuntimeState {
  return { energy: 0, maxEnergy, skillReady: false, state: 'idle' };
}
