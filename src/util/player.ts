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
import { QueueItemTreeItem } from "../provider/queueProvider";
const mpvAPI = require("node-mpv");
const vlcAPI = require("vlc-player-controller");

class MpvPlayer implements Player {
  private mpv = new mpvAPI(MPV_API_OPTIONS, MPV_ARGS);

  id = 0;
  pid = 0;

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
    const url = (await apiSongUrl([element.item.id]))[0];
    if (url === "") {
      commands.executeCommand("cloudmusic.next");
    } else {
      if (!(await this.mpv.isRunning())) {
        this.mpv.start();
      }
      try {
        await this.mpv.load(url);
        playing.set(true);
        this.mpv.play();
        this.id = element.item.id;
        this.pid = element.pid;
        if (element.item.bt > 60) {
          const delay = Math.floor(Math.random() * element.item.bt + 60);
          setTimeout(() => {
            if (this.id === element.item.id) {
              apiScrobble(this.id, this.pid, delay);
            }
          }, delay);
        }
      } catch {}
    }
  }

  async togglePlay() {
    try {
      await this.mpv.togglePause();
      if (playing.get()) {
        playing.set(false);
      } else {
        playing.set(true);
      }
    } catch {}
  }

  async volume(volumeLevel: number) {
    this.mpv.volume(volumeLevel);
  }
}

class VlcPlayer implements Player {
  private vlc = new vlcAPI({ ...VLC_API_OPTIONS });
  private volumeLevel = 85;

  id = 0;
  pid = 0;

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
    const url = (await apiSongUrl([element.item.id]))[0];
    if (url === "" || /.flac$/.exec(url)) {
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
            this.vlc.setVolume(this.volumeLevel);
            this.id = element.item.id;
            this.pid = element.pid;
            if (element.item.bt > 60) {
              const delay = Math.floor(Math.random() * element.item.bt + 60);
              setTimeout(() => {
                if (this.id === element.item.id) {
                  apiScrobble(this.id, this.pid, delay);
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
      if (playing.get()) {
        playing.set(false);
      } else {
        playing.set(true);
      }
    } catch {}
  }

  async volume(volumeLevel: number) {
    try {
      this.volumeLevel = volumeLevel;
      this.vlc.setVolume(this.volumeLevel);
    } catch {}
  }
}

export const player = PLAYER === "vlc" ? new VlcPlayer() : new MpvPlayer();
