import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../../main";
import { getImageAsset, TAVERN_BGM, type ImageAsset } from "../data/assets";
import { STATIC_COLLISIONS } from "../data/collisions";
import { TABLES } from "../data/tables";
import { canStandAt, readKeyboardIntent, resolveMove } from "../systems/movementSystem";
import { createDemoSeed, createRoundState } from "../systems/roundSystem";
import { createPlaceholderTexture, loadImageAsset } from "./BootScene";
import { DialogPanel } from "../ui/DialogPanel";
import { Joystick } from "../ui/Joystick";
import type { CollisionZone, Direction, RoundState, SeatedNpc } from "../types";

export class TavernScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private direction: Direction = "down";
  private round!: RoundState;
  private npcSprites: Array<{ seated: SeatedNpc; sprite: Phaser.GameObjects.Image; nameplate: Phaser.GameObjects.Container }> = [];
  private depthSorted: Phaser.GameObjects.GameObject[] = [];
  private dialog!: DialogPanel;
  private joystick!: Joystick;
  private target?: Phaser.Math.Vector2;
  private hintText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private bgm?: HTMLAudioElement;
  private bgmMuted = false;
  private bgmStarting = false;
  private bgmIcon?: Phaser.GameObjects.Image;
  private hoveredNpcId?: string;

  constructor() {
    super("TavernScene");
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "tavern-hall-v1");
    this.add.image(312, 474, "counter").setDepth(650).setScale(1);
    this.renderTables();
    this.dialog = new DialogPanel(this);
    this.joystick = new Joystick(this);
    this.createPlayerAnimations();

    this.player = this.add.sprite(990, 958, "xiaoxiami-idle-down").setOrigin(0.5, 200 / 220).setDepth(958).setScale(0.95);
    this.depthSorted.push(this.player);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.dialog.isOpen()) this.dialog.close();
    });

    this.hintText = this.add
      .text(GAME_WIDTH / 2, 42, "新一轮江湖来客已入座", {
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        fontSize: "30px",
        color: "#fff2cc",
        stroke: "#59341f",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(4000);
    this.countdownText = this.add
      .text(1690, 42, "", {
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        fontSize: "22px",
        color: "#fff2cc",
        stroke: "#59341f",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(4000);
    this.createBgmButton();
    this.input.once("pointerdown", () => this.startBgm());
    this.createRefreshButton();
    this.startRound();
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  update(_time: number, delta: number): void {
    const keyboard = this.isDomTextInputFocused() ? { x: 0, y: 0, moving: false, direction: this.direction } : readKeyboardIntent(this.cursors, this.wasd);
    const stick = this.joystick.getVector();
    let intent = keyboard;
    if (stick.length() > 0.16) {
      intent = {
        x: stick.x,
        y: stick.y,
        moving: true,
        direction: Math.abs(stick.x) > Math.abs(stick.y) ? (stick.x > 0 ? "right" : "left") : stick.y > 0 ? "down" : "up"
      };
    } else if (!keyboard.moving && this.target) {
      const toTarget = this.target.clone().subtract(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (toTarget.length() < 12) this.target = undefined;
      else {
        toTarget.normalize();
        intent = {
          x: toTarget.x,
          y: toTarget.y,
          moving: true,
          direction: Math.abs(toTarget.x) > Math.abs(toTarget.y) ? (toTarget.x > 0 ? "right" : "left") : toTarget.y > 0 ? "down" : "up"
        };
      }
    }

    if (intent.moving) {
      if (this.dialog.isOpen()) this.dialog.close();
      this.direction = intent.direction;
      const speed = 310;
      const next = resolveMove(this.player.x, this.player.y, intent.x * speed * (delta / 1000), intent.y * speed * (delta / 1000), this.getNpcCollisionZones());
      this.player.setPosition(next.x, next.y);
      this.player.play(`xiaoxiami-walk-${this.direction}`, true);
    } else {
      this.player.stop();
      this.player.setTexture(`xiaoxiami-idle-${this.direction}`);
    }
    this.sortDepth();
    this.updateNameplateHighlights();
    this.updateCountdown();
  }

  private renderTables(): void {
    for (const table of TABLES) {
      this.add.image(table.position.x, table.position.y, table.tableAssetKey).setDepth(table.position.y).setScale(1);
      this.add
        .text(table.position.x, table.position.y + 6, table.name, {
          fontSize: "22px",
          color: "#ffe7b3",
          stroke: "#4f2d1b",
          strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(table.position.y + 1);
    }
  }

  private createPlayerAnimations(): void {
    (["down", "up", "left", "right"] as Direction[]).forEach((direction) => {
      const key = `xiaoxiami-walk-${direction}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  private startRound(seed?: string): void {
    const initialRound = !seed ? (this.registry.get("initialRound") as RoundState | undefined) : undefined;
    const nextRound = initialRound || createRoundState(seed);
    this.registry.remove("initialRound");
    this.ensureNpcSpritesLoaded(nextRound, () => this.renderRound(nextRound));
  }

  private ensureNpcSpritesLoaded(round: RoundState, onReady: () => void): void {
    const pendingAssets = round.seatedNpcs
      .map((item) => getImageAsset(item.npc.spriteKey))
      .filter((asset): asset is ImageAsset => {
        if (!asset) return false;
        return !this.textures.exists(asset.key);
      });

    if (pendingAssets.length === 0) {
      onReady();
      return;
    }

    this.hintText.setText(`江湖来客赶路中 ${pendingAssets.length} 位...`).setAlpha(1);
    const pendingKeys = new Set(pendingAssets.map((asset) => asset.key));
    const onError = (file: { key: string; src: string }) => {
      if (!pendingKeys.has(file.key)) return;
      const asset = getImageAsset(file.key);
      console.warn(`[tavern-coder] NPC 素材加载失败，使用占位图：${file.src} (${asset?.label || file.key})。`);
    };
    const onComplete = () => {
      this.load.off("loaderror", onError);
      for (const asset of pendingAssets) {
        if (!this.textures.exists(asset.key)) createPlaceholderTexture(this, asset);
      }
      onReady();
    };

    this.load.on("loaderror", onError);
    this.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
    for (const asset of pendingAssets) loadImageAsset(this, asset);
    this.load.start();
  }

  private renderRound(round: RoundState): void {
    for (const item of this.npcSprites) {
      item.sprite.destroy();
      item.nameplate.destroy();
    }
    this.depthSorted = this.depthSorted.filter((item) => item === this.player);
    this.npcSprites = [];
    this.hoveredNpcId = undefined;
    this.round = round;

    for (const seated of this.round.seatedNpcs) {
      const sprite = this.add.image(seated.x, seated.y, seated.npc.spriteKey).setOrigin(110 / 220, 240 / 260).setDepth(seated.y).setScale(0.92);
      sprite.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(35, 24, 150, 184),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      sprite.on("pointerover", () => {
        this.hoveredNpcId = seated.npc.id;
      });
      sprite.on("pointerout", () => {
        if (this.hoveredNpcId === seated.npc.id) this.hoveredNpcId = undefined;
      });
      sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.dialog.isOpen()) return;
        this.dialog.open(seated, this.round);
      });
      const plateBg = this.add.image(0, 0, "nameplate").setScale(1.16, 1).setAlpha(0.9);
      const plateText = this.add.text(0, 3, seated.npc.name, { fontSize: "26px", color: "#fff5d1", stroke: "#522c1a", strokeThickness: 3 }).setOrigin(0.5);
      const nameplate = this.add.container(seated.x, seated.y - 208, [plateBg, plateText]).setDepth(3500).setAlpha(0.78);
      this.npcSprites.push({ seated, sprite, nameplate });
      this.depthSorted.push(sprite);
    }
    this.renderEvents();
    this.hintText.setText("新一轮江湖来客已入座").setAlpha(1);
    this.tweens.add({ targets: this.hintText, alpha: 0, delay: 1800, duration: 900 });
  }

  private renderEvents(): void {
    this.children.list
      .filter((child) => child.getData?.("eventMarker"))
      .forEach((child) => child.destroy());
    for (const table of TABLES) {
      const event = this.round.tableEvents[table.id];
      if (!event) continue;
      const prop = this.add.image(table.eventAnchor.x, table.eventAnchor.y + 70, event.visualEffectKey).setScale(0.82).setDepth(table.position.y + 2);
      const badge = this.add.image(table.eventAnchor.x, table.eventAnchor.y, "event-badge").setScale(1.1).setDepth(2600);
      const label = this.add
        .text(table.eventAnchor.x, table.eventAnchor.y, event.name, {
          fontSize: "20px",
          color: "#4b2417",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(2601);
      [prop, badge, label].forEach((item) => item.setData("eventMarker", true));
      badge.setInteractive({ useHandCursor: true }).on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.hintText.setText(`${event.name}：${event.description}`).setAlpha(1);
      });
    }
  }

  private createRefreshButton(): void {
    const button = this.add.container(145, 54).setDepth(4100);
    const bg = this.add.rectangle(0, 0, 176, 48, 0x8e4c2c, 0.92).setStrokeStyle(2, 0xf5d38a);
    const text = this.add.text(0, 0, "立即重刷", { fontSize: "22px", color: "#fff7df" }).setOrigin(0.5);
    button.add([bg, text]).setSize(176, 48).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.startRound(createDemoSeed()));
  }

  private createBgmButton(): void {
    const button = this.add.container(1815, 54).setDepth(4100);
    const bg = this.add.circle(0, 0, 28, 0x8e4c2c, 0.9).setStrokeStyle(2, 0xf5d38a);
    this.bgmIcon = this.add.image(0, 0, "icon-bgm-on").setDisplaySize(52, 52);
    button.add([bg, this.bgmIcon]).setSize(56, 56).setInteractive({ useHandCursor: true });
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.toggleBgm();
    });
    this.drawBgmIcon();
  }

  private startBgm(): void {
    if (this.bgmMuted) return;
    if (!this.bgm) {
      this.bgm = new Audio(TAVERN_BGM.path);
      this.bgm.loop = true;
      this.bgm.volume = 0.34;
      this.bgm.preload = "none";
    }
    if (this.bgmStarting || !this.bgm.paused) return;
    this.bgmStarting = true;
    void this.bgm.play().catch((error) => {
      console.warn("[tavern-coder] BGM 需要用户手势后才能播放。", error);
    }).finally(() => {
      this.bgmStarting = false;
    });
  }

  private toggleBgm(): void {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgm) this.bgm.muted = this.bgmMuted;
    if (this.bgmMuted) this.bgm?.pause();
    else this.startBgm();
    this.drawBgmIcon();
  }

  private drawBgmIcon(): void {
    if (!this.bgmIcon) return;
    this.bgmIcon.setTexture(this.bgmMuted ? "icon-bgm-off" : "icon-bgm-on");
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.dialog.isOpen()) return;
    if (pointer.y < 115 || pointer.x < 320 && pointer.y > 725) return;
    const zones = [...STATIC_COLLISIONS, ...this.getNpcCollisionZones()];
    if (canStandAt(pointer.x, pointer.y, zones)) {
      this.dialog.close();
      this.target = new Phaser.Math.Vector2(pointer.x, pointer.y);
    }
  }

  private getNpcCollisionZones(): CollisionZone[] {
    return this.npcSprites.map(({ seated }) => ({
      id: `npc-${seated.npc.id}`,
      type: "npc",
      shape: { kind: "circle", x: seated.x, y: seated.y, radius: 22 }
    }));
  }

  private sortDepth(): void {
    for (const object of this.depthSorted) {
      const sprite = object as Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      sprite.setDepth(sprite.y);
    }
  }

  private updateNameplateHighlights(): void {
    for (const item of this.npcSprites) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.seated.x, item.seated.y) < 180;
      const hovered = this.hoveredNpcId === item.seated.npc.id;
      item.nameplate.setAlpha(near || hovered ? 1 : 0.72);
      item.sprite.setTint(near || hovered ? 0xfff0c0 : 0xffffff);
    }
  }

  private isDomTextInputFocused(): boolean {
    const element = document.activeElement;
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || (element instanceof HTMLElement && element.isContentEditable);
  }

  private updateCountdown(): void {
    const ms = Math.max(0, this.round.nextRefreshAt.getTime() - Date.now());
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    this.countdownText.setText(`下次刷新 ${hours}h ${minutes}m`);
  }
}
