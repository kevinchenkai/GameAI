import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./game/scenes/BootScene";
import { TavernScene } from "./game/scenes/TavernScene";

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#17110e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  dom: {
    createContainer: true
  },
  input: {
    activePointers: 3
  },
  scene: [BootScene, TavernScene]
};

new Phaser.Game(config);
