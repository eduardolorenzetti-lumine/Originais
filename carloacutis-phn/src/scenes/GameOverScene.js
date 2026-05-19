import { readAndResetMobileAction } from "../input/mobileControls.js";
import { attachVhsOverlay } from "../effects/vhsOverlay.js?v=carlo-infinite-play-1";
import {
  getScoreboard,
  qualifiesForScoreboard,
  saveScoreboardEntry,
} from "../scoreboard.js?v=carlo-infinite-play-1";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("game-over");
  }

  init(data) {
    this.score = data.score ?? 0;
    this.mapLabel = data.mapLabel ?? "Test Map";
    this.distanceMeters = data.distanceMeters ?? 0;
  }

  create() {
    this.ready = false;
    this.textBaseY = 360;
    this.pendingScoreEntry = qualifiesForScoreboard(this.distanceMeters);
    this.playerName = "";
    this.retryUnlockAt = 0;

    this.background = this.add.image(480, 360, "game-over-background")
      .setDisplaySize(960, 720)
      .setAlpha(1)
      .setDepth(0);
    this.gameOverText = this.add.image(480, this.textBaseY, "game-over-text")
      .setDisplaySize(960, 720)
      .setAlpha(0)
      .setDepth(10);
    this.ornament = this.add.image(480, 360, "game-over-ornament")
      .setDisplaySize(960, 720)
      .setAlpha(0)
      .setDepth(12);
    this.retry = this.add.image(480, 360, "game-over-retry")
      .setDisplaySize(960, 720)
      .setAlpha(0)
      .setDepth(14);

    this.keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    attachVhsOverlay(this);
    this.createScoreboardPanel();
    this.createNameEntryPanel();
    this.input.keyboard.on("keydown", this.handleNameKey, this);
    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown", this.handleNameKey, this);
    });

    this.tweens.add({
      targets: this.gameOverText,
      alpha: 1,
      duration: 520,
      ease: "Linear",
      onComplete: () => {
        this.tweens.add({
          targets: this.gameOverText,
          y: this.textBaseY - 6,
          duration: 1150,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    this.time.delayedCall(180, () => {
      this.tweens.add({
        targets: this.ornament,
        alpha: 1,
        duration: 520,
        ease: "Linear",
      });
    });

    this.time.delayedCall(340, () => {
      this.tweens.add({
        targets: this.retry,
        alpha: 1,
        duration: 520,
        ease: "Linear",
        onComplete: () => {
          this.ready = !this.pendingScoreEntry;
          this.tweens.add({
            targets: this.retry,
            alpha: { from: 1, to: 0.45 },
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        },
      });
    });
  }

  createScoreboardPanel() {
    this.boardPanel = this.add.rectangle(480, 390, 610, 276, 0x111418, 0.78)
      .setStrokeStyle(4, 0xfff6d1, 0.85)
      .setDepth(40);
    this.boardTitle = this.add.text(480, 274, "TOP 10 DISTANCES", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "14px",
      color: "#fff6dd",
      align: "center",
    })
      .setOrigin(0.5)
      .setDepth(41);
    this.boardText = this.add.text(235, 305, "", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#fff6dd",
      lineSpacing: 8,
    })
      .setDepth(41);
    this.runDistanceText = this.add.text(480, 238, `YOUR DISTANCE: ${this.distanceMeters} M`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#f7d96b",
      align: "center",
    })
      .setOrigin(0.5)
      .setDepth(41);

    this.refreshScoreboardPanel(getScoreboard());
  }

  createNameEntryPanel() {
    this.namePrompt = this.add.text(480, 526, "NEW SCORE! TYPE YOUR NAME", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#f7d96b",
      align: "center",
    })
      .setOrigin(0.5)
      .setAlpha(this.pendingScoreEntry ? 1 : 0)
      .setDepth(45);
    this.nameText = this.add.text(480, 552, "_", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "14px",
      color: "#fff6dd",
      align: "center",
    })
      .setOrigin(0.5)
      .setAlpha(this.pendingScoreEntry ? 1 : 0)
      .setDepth(45);
    this.nameHelp = this.add.text(480, 580, "ENTER TO SAVE", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "8px",
      color: "#b9c3d6",
      align: "center",
    })
      .setOrigin(0.5)
      .setAlpha(this.pendingScoreEntry ? 1 : 0)
      .setDepth(45);
  }

  refreshScoreboardPanel(entries) {
    const lines = Array.from({ length: 10 }, (_, index) => {
      const entry = entries[index];
      const rank = String(index + 1).padStart(2, "0");
      if (!entry) {
        return `${rank}. ------------    ---- M`;
      }

      return `${rank}. ${entry.name.padEnd(12, " ")} ${String(entry.distance).padStart(5, " ")} M`;
    });

    this.boardText.setText(lines.join("\n"));
  }

  handleNameKey(event) {
    if (!this.pendingScoreEntry) {
      return;
    }

    if (event.key === "Enter") {
      const updatedEntries = saveScoreboardEntry(this.playerName, this.distanceMeters);
      this.pendingScoreEntry = false;
      this.ready = true;
      this.retryUnlockAt = this.time.now + 350;
      this.refreshScoreboardPanel(updatedEntries);
      [this.namePrompt, this.nameText, this.nameHelp].forEach((item) => item.setAlpha(0));
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      this.playerName = this.playerName.slice(0, -1);
    } else if (/^[a-zA-Z0-9 ]$/.test(event.key) && this.playerName.length < 12) {
      this.playerName += event.key.toUpperCase();
    }

    this.nameText.setText(this.playerName.length > 0 ? this.playerName : "_");
  }

  update() {
    if (!this.ready || this.time.now < this.retryUnlockAt) {
      return;
    }

    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      readAndResetMobileAction("record") ||
      readAndResetMobileAction("jump");

    if (pressed) {
      this.scene.start("runner", {
        mapIndex: 0,
        score: 0,
      });
    }
  }
}
