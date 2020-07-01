import { commands } from "vscode";
import {
  PLAYER,
  MPV_API_OPTIONS,
  MPV_ARGS,
  VLC_API_OPTIONS,
} from "../constant/setting";
import { Player } from "../constant/type";
import { buttonPlay, buttonPause } from "./util";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

class MpvPlayer implements Player {
  private mpv = new mpvAPI(MPV_API_OPTIONS, MPV_ARGS);

  async start() {
    this.mpv.start();
    this.mpv.on("stopped", () => {
      commands.executeCommand("cloudmusic.next");
    });
  }
  async quit() {
    this.mpv.quit();
  }

  async load(url: string) {
    try {
      await this.mpv.load(url);
      buttonPause();
    } catch {}
  }

  async stop() {
    try {
      await this.mpv.stop();
      buttonPlay();
    } catch {}
  }

  async togglePause() {
    try {
      await this.mpv.togglePause();
      if (await this.mpv.isPaused()) {
        buttonPause();
      } else {
        buttonPlay();
      }
    } catch {}
  }

  async volume(volumeLevel: number) {
    this.mpv.volume(volumeLevel);
  }
}

class VlcPlayer implements Player {
  private vlc = new vlcAPI({ ...VLC_API_OPTIONS });
  private playing: boolean = false;
  private static timer: NodeJS.Timer = setTimeout(() => {}, 0);

  private static resetTimer() {
    clearTimeout(VlcPlayer.timer);
    VlcPlayer.timer = setTimeout(() => {
      commands.executeCommand("cloudmusic.next");
    }, 2000);
  }

  async start() {}

  async quit() {
    try {
      this.vlc.quit();
    } catch {}
  }

  async load(url: string) {
    this.quit();
    try {
      delete this.vlc;
      this.vlc = new vlcAPI({ ...VLC_API_OPTIONS, ...{ media: url } });
      this.vlc.launch(() => {
        this.vlc.on("playback", VlcPlayer.resetTimer);
      });
      this.playing = true;
      buttonPause();
    } catch {}
  }

  async stop() {
    this.quit();
  }

  async togglePause() {
    try {
      this.vlc.cyclePause();
      this.playing = !this.playing;
      if (this.playing) {
        buttonPause();
      } else {
        buttonPlay();
      }
    } catch {}
  }

  async volume(volumeLevel: number) {}
}

export const player = PLAYER === "vlc" ? new VlcPlayer() : new MpvPlayer();
