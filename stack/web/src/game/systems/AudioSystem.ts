export type SoundCue =
  | 'tap'
  | 'jump'
  | 'match'
  | 'win'
  | 'fail'
  | 'undo'
  | 'shuffle'
  | 'button'
  | 'tray_full';

const CUE_FREQUENCIES: Readonly<Record<SoundCue, number>> = {
  tap: 520,
  jump: 660,
  match: 880,
  win: 1040,
  fail: 220,
  undo: 420,
  shuffle: 580,
  button: 500,
  tray_full: 180,
};

export class AudioSystem {
  private context: AudioContext | null = null;

  adoptContext(context: AudioContext): void {
    this.context = context;
  }

  play(cue: SoundCue): void {
    const context = this.context;
    if (context === null) return;
    const playTone = (): void => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = cue === 'fail' || cue === 'tray_full' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(CUE_FREQUENCIES[cue], now);
      if (cue === 'win' || cue === 'match') {
        oscillator.frequency.exponentialRampToValueAtTime(CUE_FREQUENCIES[cue] * 1.18, now + 0.1);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.14);
    };

    if (context.state === 'suspended') {
      void context.resume().then(playTone).catch(() => undefined);
    } else if (context.state === 'running') {
      playTone();
    }
  }
}
