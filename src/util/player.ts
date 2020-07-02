import { commands } from "vscode";
import {
  PLAYER,
  MPV_API_OPTIONS,
  MPV_ARGS,
  VLC_API_OPTIONS,
} from "../constant/setting";
import { Player } from "../constant/type";
import { API_scrobble, API_songUrl } from "./api";
import { buttonPlay, buttonPause } from "./util";
import { QueueItemTreeItem } from "../provider/queueProvider";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

class MpvPlayer implements Player {
  private mpv = new mpvAPI(MPV_API_OPTIONS, MPV_ARGS);

  id = 0;
  pid = 0;

  async start() {
    this.mpv.start();
    this.mpv.on("stopped", () => {
      commands.executeCommand("cloudmusic.next");
    });
  }
  async quit() {
    this.mpv.quit();
  }

  async load(element: QueueItemTreeItem) {
    try {
      const url = (await API_songUrl([element.item.id]))[0];
      await this.mpv.load(url);
      this.id = element.item.id;
      this.pid = element.pid;
      if (element.item.bt > 60) {
        const delay = Math.floor(Math.random() * element.item.bt + 60);
        setTimeout(() => {
          if (this.id === element.item.id) {
            API_scrobble(this.id, this.pid, delay);
          }
        }, delay);
      }
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
  private volumeLevel: number = 0.85;

  id = 0;
  pid = 0;

  async start() {}

  async quit() {
    try {
      this.vlc.quit();
    } catch {}
  }

  async load(element: QueueItemTreeItem) {
    this.quit();
    try {
      delete this.vlc;
      const url = (await API_songUrl([element.item.id]))[0];
      this.vlc = new vlcAPI({ ...VLC_API_OPTIONS, ...{ media: url } });
      this.vlc.on("playback-ended", () => {
        commands.executeCommand("cloudmusic.next");
      });
      this.vlc.launch((err: any) => {
        if (err) {
          commands.executeCommand("cloudmusic.next");
        } else {
          this.vlc.setVolume(this.volumeLevel);
        }
      });
      this.playing = true;
      this.id = element.item.id;
      this.pid = element.pid;
      if (element.item.bt > 60) {
        const delay = Math.floor(Math.random() * element.item.bt + 60);
        setTimeout(() => {
          if (this.id === element.item.id) {
            API_scrobble(this.id, this.pid, delay);
          }
        }, delay);
      }
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

  async volume(volumeLevel: number) {
    try {
      if (volumeLevel > 100) {
        volumeLevel = 100;
      } else if (volumeLevel < 0) {
        volumeLevel = 0;
      }
      this.volumeLevel = volumeLevel / 100.0;
      this.vlc.setVolume(this.volumeLevel);
    } catch {}
  }
}

export const player = PLAYER === "vlc" ? new VlcPlayer() : new MpvPlayer();
