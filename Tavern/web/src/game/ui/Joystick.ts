import Phaser from "phaser";

export class Joystick {
  private base: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Image;
  private pointerId?: number;
  private vector = new Phaser.Math.Vector2(0, 0);
  private radius = 70;

  constructor(scene: Phaser.Scene) {
    this.base = scene.add.image(150, 900, "joystick-base").setScrollFactor(0).setAlpha(0.72).setDepth(3000);
    this.knob = scene.add.image(150, 900, "joystick-knob").setScrollFactor(0).setAlpha(0.86).setDepth(3001);
    this.base.setInteractive({ useHandCursor: true });
    scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > 360 || pointer.y < 700 || this.pointerId !== undefined) return;
      this.pointerId = pointer.id;
      this.update(pointer);
    });
    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) this.update(pointer);
    });
    scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) this.reset();
    });
  }

  getVector(): Phaser.Math.Vector2 {
    return this.vector.clone();
  }

  private update(pointer: Phaser.Input.Pointer): void {
    const origin = new Phaser.Math.Vector2(this.base.x, this.base.y);
    const next = new Phaser.Math.Vector2(pointer.x, pointer.y).subtract(origin);
    if (next.length() > this.radius) next.setLength(this.radius);
    this.vector = next.clone().scale(1 / this.radius);
    this.knob.setPosition(origin.x + next.x, origin.y + next.y);
  }

  private reset(): void {
    this.pointerId = undefined;
    this.vector.set(0, 0);
    this.knob.setPosition(this.base.x, this.base.y);
  }
}
