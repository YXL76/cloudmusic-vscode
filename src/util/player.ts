import * as http from "http";
import { join } from "path";
import { createWriteStream } from "fs";
import { commands } from "vscode";
import {
  TMP_DIR,
  PLAYER,
  MPV_API_OPTIONS,
  MPV_ARGS,
  VLC_API_OPTIONS,
} from "../constant/setting";
import { Player } from "../constant/type";
import { apiScrobble, apiSongUrl } from "./api";
import { playing } from "../state/play";
import { volumeLevel } from "../state/volume";
import { Cache } from "../util/cache";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { setTimeout } from "timers";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

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

  private async play(url: string, id: number, pid: number, dt: number) {
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
    } catch {}
  }

  async load(element: QueueItemTreeItem) {
    const { pid, md5 } = element;
    const { id, dt } = element.item;
    const path = await Cache.get(`${id}`, md5);

    if (path) {
      this.play(path, id, pid, dt);
    } else {
      const { url } = (await apiSongUrl([element.item.id]))[0];
      if (!url) {
        commands.executeCommand("cloudmusic.next");
        return;
      }
      const ext = (/(\.\w+)$/.exec(url) || ["mp3"])[0];
      const tmpFilePath = join(TMP_DIR, `${id}${ext}`);
      const tmpFile = createWriteStream(tmpFilePath);

      http
        .get(url, (res) => {
          res.pipe(tmpFile);
          tmpFile.on("finish", () => {
            tmpFile.close();
            Cache.put(`${id}`, tmpFilePath);
          });
        })
        .on("response", () => {
          this.play(tmpFilePath, id, pid, dt);
        });
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

  private async play(url: string, id: number, pid: number, dt: number) {
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
    } catch {}
  }

  async load(element: QueueItemTreeItem) {
    const { pid, md5 } = element;
    const { id, dt } = element.item;
    const path = await Cache.get(`${id}`, md5);

    if (path) {
      await this.play(path, id, pid, dt);
    } else {
      const { url } = (await apiSongUrl([element.item.id]))[0];
      if (!url) {
        await commands.executeCommand("cloudmusic.next");
        return;
      }
      const ext = (/(\.\w+)$/.exec(url) || ["mp3"])[0];
      const tmpFilePath = join(TMP_DIR, `${id}${ext}`);
      const tmpFile = createWriteStream(tmpFilePath);

      http
        .get(url, (res) => {
          res.pipe(tmpFile);
          tmpFile.on("finish", () => {
            tmpFile.close();
            Cache.put(`${id}`, tmpFilePath);
          });
        })
        .on("response", () => {
          this.play(tmpFilePath, id, pid, dt);
        });
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

export const player = PLAYER === "vlc" ? new VlcPlayer() : new MpvPlayer();
