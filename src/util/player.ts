import { posix } from "path";
import { unlinkSync } from "fs";
import { commands } from "vscode";
import {
  TMP_DIR,
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
import { playing } from "../state/play";
import { volumeLevel } from "../state/volume";
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
    this.mpv.on("stopped", () => {
      commands.executeCommand("cloudmusic.next");
    });
    return this.mpv.start();
  }

  async quit() {
    playing.set(false);
    try {
      await this.mpv.pause();
    } catch {}
  }

  private async noop(): Promise<void> {
    //
  }

  async load(url: string, id: number, pid: number, dt: number) {
    const reload = this.mpv.isRunning() ? this.noop : this.mpv.start;
    reload()
      .then(() => {
        setTimeout(async () => {
          this.mpv
            .load(url)
            .then(async () => {
              try {
                unlinkSync(posix.join(TMP_DIR, `${this.id}`));
              } catch {}
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
                await this.mpv.play();
              }
              try {
                await this.volume(volumeLevel.get());
              } catch {}

              lock.playerLoad = false;

              const diff = this.time - pTime;
              if (diff > 60000 && pDt > 60000) {
                apiScrobble(pId, pPid, Math.floor(Math.min(diff, pDt) / 1000));
              }
            })
            .catch(() => (lock.playerLoad = false));
        }, 128);
      })
      .catch(() => (lock.playerLoad = false));
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
    try {
      await this.vlc.quit();
      playing.set(false);
    } catch {}
  }

  async load(url: string, id: number, pid: number, dt: number) {
    await this.quit();
    const { media } = this.vlc;
    delete this.vlc;
    try {
      this.vlc = new vlcAPI({ ...VLC_API_OPTIONS, ...{ media: url } });
      this.vlc.on("playback-ended", () => {
        commands.executeCommand("cloudmusic.next");
      });
      this.vlc.launch((err: string) => {
        try {
          if (media.indexOf(TMP_DIR) !== -1) {
            unlinkSync(media);
          }
        } catch {}
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
