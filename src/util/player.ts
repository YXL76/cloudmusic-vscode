import { commands } from "vscode";
import {
  PLAYER,
  MPV_API_OPTIONS,
  MPV_ARGS,
  VLC_API_OPTIONS,
} from "../constant/setting";
import { Player } from "../constant/type";
import { apiScrobble, apiSongUrl } from "./api";
import { playing } from "../state/play";
import { volumeLevel } from "../state/volume";
import { QueueItemTreeItem } from "../provider/queueProvider";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

class MpvPlayer implements Player {
  private mpv = new mpvAPI(MPV_API_OPTIONS, MPV_ARGS);

  id = 0;

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

  async load(element: QueueItemTreeItem) {
    const song = (await apiSongUrl([element.item.id]))[0];
    const { url } = song;
    if (!url) {
      commands.executeCommand("cloudmusic.next");
    } else {
      if (!(await this.mpv.isRunning())) {
        this.mpv.start();
      }
      try {
        await this.mpv.load(url);
        playing.set(true);
        this.volume(volumeLevel.get());
        this.mpv.play();
        this.id = element.item.id;
        if (element.item.dt > 60000) {
          const delay = Math.floor(Math.random() * element.item.dt + 60000);
          setTimeout(() => {
            if (this.id === element.item.id) {
              apiScrobble(
                element.item.id,
                element.pid,
                Math.floor(delay / 1000)
              );
            }
          }, delay);
        }
      } catch {}
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

  async start() {
    //
  }

  async quit() {
    try {
      await this.vlc.quit();
      playing.set(false);
    } catch {}
  }

  async load(element: QueueItemTreeItem) {
    const song = (await apiSongUrl([element.item.id]))[0];
    const { url } = song;
    if (!url || /.flac$/.exec(url)) {
      commands.executeCommand("cloudmusic.next");
    } else {
      await this.quit();
      try {
        delete this.vlc;
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
            this.id = element.item.id;
            if (element.item.dt > 60000) {
              const delay = Math.floor(Math.random() * element.item.dt + 60000);
              setTimeout(() => {
                if (this.id === element.item.id) {
                  apiScrobble(
                    element.item.id,
                    element.pid,
                    Math.floor(delay / 1000)
                  );
                }
              }, delay);
            }
          }
        });
      } catch {}
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
