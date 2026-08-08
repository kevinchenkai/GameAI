/**
 * game/pet/events.ts —— 宠物事件
 *
 * ★ 不在 core/ 里（冻结契约 1）。既然规定 core/ 不认识 Phaser，
 *   就应当同样规定 core/ 不认识旺财——不认识宠物 UI、等级、能量。
 *   Core 只负责棋盘规则和关卡规则。
 *
 *   因此 petEnergy / petSkillReady / petSkillFire 从 CoreGameEvent 中移除，
 *   另立本套。
 */

import type { PetState } from './state';

export type PetEvent =
  | { readonly t: 'petEnergyChanged'; readonly value: number; readonly max: number }
  | {
      readonly t: 'petReactionRequested';
      readonly state: PetState;
      readonly intensity: number;
    }
  | { readonly t: 'petSkillReady' }
  | { readonly t: 'petSkillRequested'; readonly skill: string }
  | { readonly t: 'petStateChanged'; readonly from: PetState; readonly to: PetState };
