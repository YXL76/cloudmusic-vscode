import { commands } from "vscode";
import { ButtonLabel, ButtonManager } from "../manager/buttonManager";
const mpvAPI = require("node-mpv-km");

const mpv = new mpvAPI({
  audio_only: true,
  auto_restart: true,
  // binary: null,
  debug: false,
  ipcCommand: null,
  time_update: 1,
  verbose: false,
});

mpv.on("stopped", () => {
  commands.executeCommand("cloudmusic.next");
});

export class Player {
  static player = mpv;
  static buttonManager: ButtonManager = ButtonManager.getInstance();

  static async start() {
    mpv.start();
  }

  static async quit() {
    mpv.quit();
  }

  private static buttonPlay() {
    Player.buttonManager.updateButton(ButtonLabel.Play, "$(play)", "PLay");
  }

  private static buttonPause() {
    Player.buttonManager.updateButton(
      ButtonLabel.Play,
      "$(debug-pause)",
      "Pause"
    );
  }

  static async load(url: string) {
    mpv.load(url);
    Player.buttonPause();
  }

  static async stop() {
    mpv.stop();
    Player.buttonPlay();
  }

  static async togglePause() {
    mpv.togglePause();
    if (await mpv.isPaused()) {
      Player.buttonPause();
    } else {
      Player.buttonPlay();
    }
  }

  static async volume(volumeLevel: number) {
    mpv.volume(volumeLevel);
  }
}
