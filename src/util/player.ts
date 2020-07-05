import { commands } from "vscode";
import {
  PLAYER,
  MPV_API_OPTIONS,
  MPV_ARGS,
  MPV_AVAILABLE,
  VLC_API_OPTIONS,
  VLC_AVAILABLE,
} from "../constant/setting";
import { Player } from "../constant/type";
import { apiScrobble } from "./api";
import { playing } from "../state/play";
import { volumeLevel } from "../state/volume";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

export const lock = {
  playerLoad: false,
};

class EmptyPlayer implements Player {
  id = 0;
  pid = 0;
  dt = 0;
  time = 0;

  async start() {
    //
  }

  async quit() {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async load(_url: string, _id: number, _pid: number, _dt: number) {
    //
  }

  async togglePlay() {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async volume(_level: number) {
    //
  }
}

class MpvPlayer implements Player {
  private mpv = new mpvAPI(MPV_API_OPTIONS, MPV_ARGS);

  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();

  async start() {
    if (!(await this.mpv.isRunning())) {
      this.mpv.start();
    }
    this.mpv.on("stopped", () => {
      commands.executeCommand("cloudmusic.next");
    });
  }

  async quit() {
    playing.set(false);
    try {
      this.mpv.quit();
      playing.set(false);
    } catch {}
  }

  async load(url: string, id: number, pid: number, dt: number) {
    if (!(await this.mpv.isRunning())) {
      this.mpv.start();
    }
    try {
      await this.mpv.load(url);
      playing.set(true);
      this.volume(volumeLevel.get());
      this.mpv.play();
      const currentTime = Date.now();
      const diff = (currentTime - this.time) / 1000;
      if (diff > 60000 && this.dt > 60000) {
        apiScrobble(id, pid, Math.floor(Math.min(diff + 1, dt - 1) / 1000));
      }
      this.id = id;
      this.pid = pid;
      this.dt = dt;
      this.time = currentTime;
    } finally {
      lock.playerLoad = false;
    }
  }

  async togglePlay() {
    try {
      await this.mpv.togglePause();
      playing.set(!playing.get());
    } catch {}
  }

  async volume(level: number) {
    try {
      this.mpv.volume(level);
      volumeLevel.set(level);
    } catch {}
  }
}

class VlcPlayer implements Player {
  private vlc = new vlcAPI({ ...VLC_API_OPTIONS });

  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();

  async start() {
    //
  }

  async quit() {
    try {
      await this.vlc.quit();
      delete this.vlc;
      playing.set(false);
    } catch {}
  }

  async load(url: string, id: number, pid: number, dt: number) {
    await this.quit();
    try {
      this.vlc = new vlcAPI({ ...VLC_API_OPTIONS, ...{ media: url } });
      this.vlc.on("playback-ended", () => {
        commands.executeCommand("cloudmusic.next");
      });
      this.vlc.launch((err: string) => {
        if (err) {
          commands.executeCommand("cloudmusic.next");
        } else {
          playing.set(true);
          this.volume(volumeLevel.get());
          const currentTime = Date.now();
          const diff = currentTime - this.time;
          if (diff > 60000 && this.dt > 60000) {
            apiScrobble(id, pid, Math.floor(Math.min(diff, dt) / 1000));
          }
          this.id = id;
          this.pid = pid;
          this.dt = dt;
          this.time = currentTime;
        }
      });
    } finally {
      lock.playerLoad = false;
    }
  }

  async togglePlay() {
    try {
      await this.vlc.cyclePause();
      playing.set(!playing.get());
    } catch {}
  }

  async volume(level: number) {
    try {
      this.vlc.setVolume(level);
      volumeLevel.set(level);
    } catch {}
  }
}

export const player =
  PLAYER === "vlc" && VLC_AVAILABLE
    ? new VlcPlayer()
    : MPV_AVAILABLE
    ? new MpvPlayer()
    : new EmptyPlayer();
