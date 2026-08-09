/**
 * game/audio/sfxPlan.ts —— 事件 → 该响什么（纯逻辑，零 WebAudio）
 *
 * ★ 与渲染层同构：音频**消费同一份 CoreGameEvent[]**，
 *   不另起一套时序（CLAUDE.md §4.2 事件序列是唯一真相源）。
 *
 * ★ 把"该响什么"从"怎么发声"里拆出来，是因为前者能测：
 *   连锁升调有没有超出中频、节流有没有生效、失败音会不会被漏掉 ——
 *   这些都是断言得了的。WebAudio 那半只能靠耳朵。
 */

import {
  AUDIBLE_BAND,
  CASCADE_SEMITONE_STEP,
  CASCADE_SFX_FROM_LEVEL,
  SFX,
  SFX_THROTTLE_MS,
  type SfxName,
} from '../../config/audio';
import type { CoreGameEvent } from '../../core/types';

export interface SfxCue {
  readonly name: SfxName;
  /** 相对本段开头的偏移（ms）。★ 与渲染时间轴无关，音频不等动画 */
  readonly atMs: number;
  /** 频率倍数（连锁升调用）。1 = 原始音高 */
  readonly pitchScale: number;
}

const SEMITONE = 1.059463094359;

/**
 * 连锁第 n 层的音高倍数（n 从 0 起）。
 *
 * ★ **必须夹在中频带内**：8 连锁 × 2 半音 = 16 半音 ≈ 2.5 倍，
 *   660Hz 会飘到 1650Hz 尚可，但 obstacleClear 的 980Hz 会到 2450Hz ——
 *   那已经超出 50+ 用户的可靠听感范围。这里按基频反算上限。
 */
export function cascadePitch(baseFreq: number, depth: number): number {
  const raw = Math.pow(SEMITONE, CASCADE_SEMITONE_STEP * Math.max(0, depth));
  const maxScale = AUDIBLE_BAND.maxHz / baseFreq;
  return Math.min(raw, Math.max(1, maxScale));
}

/**
 * 把一段事件翻译成音效提示。
 *
 * ★ 不是每个事件都发声 —— 声音太密就成了噪音。
 *   只挑玩家**需要确认**的那几件事：动了、消了、破了、结束了。
 */
export function planSfx(events: readonly CoreGameEvent[]): readonly SfxCue[] {
  const cues: SfxCue[] = [];
  const lastAt = new Map<SfxName, number>();
  let cursor = 0;

  const push = (name: SfxName, pitchScale = 1): void => {
    // ★ 节流：连锁会在几十毫秒内产生一串同名事件，
    //   逐个发声会叠成噪音，且瞬时音量叠加到削波
    const prev = lastAt.get(name);
    if (prev !== undefined && cursor - prev < SFX_THROTTLE_MS) return;
    lastAt.set(name, cursor);
    cues.push({ name, atMs: cursor, pitchScale });
  };

  for (const e of events) {
    switch (e.t) {
      case 'swap':
        push('swap');
        break;

      case 'swapBack':
        push('swapBack');
        break;

      case 'match': {
        /**
         * ★ 连锁层数**直接读事件里的 `cascadeLevel`**，不自己数。
         *   自己维护一份计数就等于渲染层又存了一份状态 ——
         *   与 core 一旦不同步就会出现"画面第 3 连锁、声音还在第 1 层"，
         *   而且没有任何报错（CLAUDE.md §4.2：事件序列是唯一真相源）。
         */
        /**
         * ★ 消除**规模**也参与音高：消 5 个比消 3 个更高一点。
         *
         *   此前无论消 3 个还是消 5 个都是同一个音 —— 而画面上
         *   粒子数是随规模变的，听觉却没跟上。
         *   幅度刻意很小（每多一个 +1 档，最多 +2 档）：
         *   这是"顺带确认"，抢戏的应该是连锁升调。
         */
        const sizeBonus = Math.min(Math.max(e.positions.length - 3, 0), 2);
        /**
         * ⚠️ 层级升调**由 cascadeStart 负责**，这里只表达"规模"。
         *
         *   曾经两边都按层级升调，但 match 还额外加了 sizeBonus，
         *   于是同一层的两个音**音高不一致**，整串听下来是
         *   1.26 → 1.12 → 1.41 → 1.26 的锯齿，不是"越来越高"。
         *   一个信号只由一个地方表达，否则必然打架。
         */
        /**
         * ★ 层级仍然参与，但**权重远低于 cascadeStart**（半档 vs 整档）。
         *
         *   为什么不干脆去掉：`cascadeStart` 与 `match` 的先后顺序是
         *   core 的实现细节。真实序列里两者必然成对出现，可一旦
         *   将来某条路径只发 match，层级信息就**静默消失**了。
         *   留半档既保证降级安全，又不会盖过 cascadeStart 的表达。
         */
        const lvlBonus = e.cascadeLevel > 0 ? Math.min(e.cascadeLevel, 2) * 0.5 : 0;
        push(
          e.cascadeLevel > 0 ? 'cascade' : 'match',
          cascadePitch(SFX.match.freq, sizeBonus + lvlBonus),
        );
        cursor += 20; // 同段内轻微错开，避免完全重合
        break;
      }

      /**
       * ★★ 生成特殊棋子 —— 此前完全无声。
       *
       *   match-4 凑出火箭是玩家少数几个"我是故意的"时刻，
       *   视觉上有叠加层出现，听觉上却什么都没有。
       *
       * ★ **不走节流**：它与触发它的那次 match 必然紧邻（同一段内相差
       *   十几毫秒），走 push() 会被 SFX_THROTTLE_MS 判成重复而丢掉 ——
       *   但它和 match 是两件不同的事，都该被听见。
       *   节流防的是"同名音效连发成噪音"，这里不是那种情况。
       */
      case 'specialSpawn':
        cues.push({ name: 'specialSpawn', atMs: cursor + 40, pitchScale: 1 });
        break;

      /**
       * ★★ 连锁层级本身要有声音，**不能只靠 match 的升调**。
       *
       *   实测：3 层连锁只发出 2 个音 —— 第 3 次 match 与前一次相隔
       *   仅 20ms，被 SFX_THROTTLE_MS(45ms) 判成重复丢掉了。
       *   于是"连锁越深越激动"在听觉上**根本不成立**，
       *   深连锁和普通消除听起来一样 —— 正是 A1 要解决的那个问题。
       *
       *   视觉侧靠 `cascadeStart` 解决了（震屏 + 连击文字），
       *   音频侧也必须消费同一个事件，两边才对称。
       *
       * ★ 不走节流：cascadeStart 每层只出现一次，本就不密集；
       *   而它恰恰是**最不能被丢掉**的那个音。
       */
      case 'cascadeStart':
        if (e.level >= CASCADE_SFX_FROM_LEVEL) {
          cues.push({
            name: 'cascade',
            atMs: cursor,
            pitchScale: cascadePitch(SFX.cascade.freq, e.level),
          });
          cursor += 30;
        }
        break;

      case 'specialFire':
        push('specialFire');
        break;

      /**
       * ★ 合体引爆：全局最重的一击，同样不节流 ——
       *   它一局里最多出现几次，每次都必须听见。
       */
      case 'comboBlast':
        cues.push({ name: 'comboBlast', atMs: cursor, pitchScale: 1 });
        break;

      case 'obstacleHit':
        push('obstacleHit');
        break;

      case 'obstacleClear':
        push('obstacleClear');
        break;

      case 'levelWin':
        // ★ 结算音单独放在最后，且不受节流影响 —— 它必须响
        cues.push({ name: 'win', atMs: cursor + 120, pitchScale: 1 });
        break;

      case 'levelLose':
        cues.push({ name: 'lose', atMs: cursor + 120, pitchScale: 1 });
        break;

      default:
        break;
    }
  }

  return cues;
}
