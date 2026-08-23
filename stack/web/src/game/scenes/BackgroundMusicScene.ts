import Phaser from 'phaser';
import { ASSETS } from '../config/assets';

export const BACKGROUND_MUSIC_SCENE_KEY = 'BackgroundMusic';
export const BACKGROUND_MUSIC_LOAD_DELAY_MS = 800;
export const BACKGROUND_MUSIC_VOLUME = 0.2;

interface BackgroundMusicSceneData {
  enabled?: boolean;
}

type PlayableMusic = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

/**
 * 常驻的 BGM 场景。
 *
 * 它在首屏已经渲染后才启动自己的 Loader，因此不会把 400 KB 音乐放进
 * PreloadScene 的关键路径；Scene 切换也不会中断正在进行的音频加载。
 */
export class BackgroundMusicScene extends Phaser.Scene {
  private music: PlayableMusic | null = null;
  private enabled = true;
  private loadStarted = false;
  private loadComplete = false;
  private delayedLoad: Phaser.Time.TimerEvent | null = null;
  private volumeTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super(BACKGROUND_MUSIC_SCENE_KEY);
  }

  create(data: BackgroundMusicSceneData = {}): void {
    this.enabled = data.enabled ?? true;
    this.sound.on(Phaser.Sound.Events.UNLOCKED, this.tryStart, this);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, this.handleFirstInteraction, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    if (this.enabled) {
      this.delayedLoad = this.time.delayedCall(
        BACKGROUND_MUSIC_LOAD_DELAY_MS,
        this.beginLoad,
        [],
        this,
      );
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.fadeOut();
      return;
    }
    this.beginLoad();
    this.tryStart();
  }

  private handleFirstInteraction(): void {
    if (!this.enabled) return;
    this.delayedLoad?.remove(false);
    this.delayedLoad = null;
    this.beginLoad();
    this.tryStart();
  }

  private beginLoad(): void {
    if (!this.enabled || this.loadStarted || this.loadComplete) return;
    this.loadStarted = true;
    const definition = ASSETS.audio.backgroundMusic;
    this.load.once(Phaser.Loader.Events.COMPLETE, this.handleLoadComplete, this);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError, this);
    this.load.audio(definition.key, [...definition.paths]);
    this.load.start();
  }

  private handleLoadComplete(): void {
    this.loadComplete = this.cache.audio.exists(ASSETS.audio.backgroundMusic.key);
    if (!this.loadComplete) return;
    this.music = this.sound.add(ASSETS.audio.backgroundMusic.key, {
      loop: true,
      volume: 0,
    }) as PlayableMusic;
    this.tryStart();
  }

  private handleLoadError(file: Phaser.Loader.File): void {
    if (file.key !== ASSETS.audio.backgroundMusic.key) return;
    console.warn('[BGM] unable to load background music');
  }

  private tryStart(): void {
    const music = this.music;
    if (!this.enabled || !this.loadComplete || music === null || this.sound.locked) return;
    this.volumeTween?.stop();
    if (music.isPaused) {
      music.resume();
    } else if (!music.isPlaying) {
      music.play({ loop: true, volume: 0 });
    }
    this.fadeVolume(music, BACKGROUND_MUSIC_VOLUME, 500, 'Sine.easeOut');
  }

  private fadeOut(): void {
    const music = this.music;
    if (music === null || (!music.isPlaying && !music.isPaused)) return;
    this.volumeTween?.stop();
    if (music.isPaused) {
      music.setVolume(0);
      return;
    }
    this.fadeVolume(music, 0, 180, 'Sine.easeIn', () => music.pause());
  }

  private fadeVolume(
    music: PlayableMusic,
    targetVolume: number,
    duration: number,
    ease: string,
    onComplete?: () => void,
  ): void {
    const level = { value: music.volume };
    this.volumeTween = this.tweens.add({
      targets: level,
      value: targetVolume,
      duration,
      ease,
      onUpdate: () => music.setVolume(level.value),
      onComplete: () => {
        music.setVolume(targetVolume);
        this.volumeTween = null;
        onComplete?.();
      },
    });
  }

  private handleShutdown(): void {
    this.delayedLoad?.remove(false);
    this.sound.off(Phaser.Sound.Events.UNLOCKED, this.tryStart, this);
    this.volumeTween?.stop();
    this.music?.destroy();
    this.music = null;
  }
}

export function syncBackgroundMusic(scene: Phaser.Scene, enabled: boolean): void {
  if (!scene.scene.isActive(BACKGROUND_MUSIC_SCENE_KEY)) {
    scene.scene.launch(BACKGROUND_MUSIC_SCENE_KEY, { enabled });
    return;
  }
  const backgroundMusic = scene.scene.get(BACKGROUND_MUSIC_SCENE_KEY) as BackgroundMusicScene;
  backgroundMusic.setEnabled(enabled);
}
