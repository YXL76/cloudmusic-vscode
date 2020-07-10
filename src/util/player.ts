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
import { lock } from "../state/lock";
import { playing, position } from "../state/play";
import { volumeLevel } from "../state/volume";
import { ButtonManager } from "../manager/buttonManager";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

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
    if (!this.mpv.isRunning()) {
      await this.mpv.start();
      this.mpv.on("stopped", () => {
        commands.executeCommand("cloudmusic.next");
      });
      this.mpv.on("timeposition", (res: number) => {
        position.set(res);
      });
    }
  }

  async quit() {
    ButtonManager.buttonSong("Song", "");
    playing.set(false);
    position.set(0);
    try {
      await this.mpv.pause();
    } catch {}
  }

  async load(url: string, id: number, pid: number, dt: number) {
    if (!this.mpv.isRunning()) {
      await this.mpv.start();
    }
    this.mpv
      .load(url)
      .then(() => {
        const pId = this.id;
        const pPid = this.pid;
        const pDt = this.dt;
        const pTime = this.time;
        this.id = id;
        this.pid = pid;
        this.dt = dt;
        this.time = Date.now();

        if (!playing.get()) {
          playing.set(true);
          try {
            this.mpv.play();
          } catch {}
        }

        const diff = this.time - pTime;
        if (diff > 60000 && pDt > 60000) {
          apiScrobble(pId, pPid, Math.floor(Math.min(diff, pDt) / 1000));
        }

        lock.playerLoad = false;
      })
      .catch(() => {
        lock.playerLoad = false;
        commands.executeCommand("cloudmusic.next");
      });
  }

  async togglePlay() {
    if (this.id) {
      try {
        await this.mpv.togglePause();
        playing.set(!playing.get());
      } catch {}
    }
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
    ButtonManager.buttonSong("Song", "");
    try {
      await this.vlc.quit();
      playing.set(false);
      position.set(0);
    } catch {}
  }

  async load(url: string, id: number, pid: number, dt: number) {
    await this.quit();
    delete this.vlc;
    try {
      this.vlc = new vlcAPI({ ...VLC_API_OPTIONS, ...{ media: url } });
      this.vlc.on("playback-ended", () => {
        commands.executeCommand("cloudmusic.next");
      });
      this.vlc.on("playback", (res: { name: string; value: number }) => {
        const { name, value } = res;
        if (name === "time-pos") {
          position.set(value);
        }
      });
      this.vlc.launch((err: string) => {
        if (err) {
          commands.executeCommand("cloudmusic.next");
        } else {
          const pId = this.id;
          const pPid = this.pid;
          const pDt = this.dt;
          const pTime = this.time;
          this.id = id;
          this.pid = pid;
          this.dt = dt;
          this.time = Date.now();

          playing.set(true);
          this.volume(volumeLevel.get());
          setTimeout(() => this.vlc.command(["pl_play"]), 512);

          const diff = this.time - pTime;
          if (diff > 60000 && pDt > 60000) {
            apiScrobble(pId, pPid, Math.floor(Math.min(diff, pDt) / 1000));
          }
        }
        lock.playerLoad = false;
      });
    } catch {
      lock.playerLoad = false;
    }
  }

  async togglePlay() {
    if (this.id) {
      try {
        await this.vlc.cyclePause();
        playing.set(!playing.get());
      } catch {}
    }
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
