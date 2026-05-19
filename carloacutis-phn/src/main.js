import { GAME_HEIGHT, GAME_WIDTH } from "./config.js?v=carlo-infinite-play-1";
import { BootScene } from "./scenes/BootScene.js?v=carlo-infinite-play-1";
import { StudioIntroScene } from "./scenes/StudioIntroScene.js?v=carlo-infinite-play-1";
import { IntroHallScene } from "./scenes/IntroHallScene.js?v=carlo-infinite-play-1";
import { TutorialScene } from "./scenes/TutorialScene.js?v=carlo-infinite-play-1";
import { RunnerScene } from "./scenes/RunnerScene.js?v=carlo-infinite-play-1";
import { GameOverScene } from "./scenes/GameOverScene.js?v=carlo-infinite-play-1";
import { VictoryScene } from "./scenes/VictoryScene.js?v=carlo-infinite-play-1";

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-root",
  backgroundColor: "#000000",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, StudioIntroScene, IntroHallScene, TutorialScene, RunnerScene, GameOverScene, VictoryScene],
});

window.carloGame = game;
