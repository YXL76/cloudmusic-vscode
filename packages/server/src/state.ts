import { IPCPlayer } from "@cloudmusic/shared";
import { IPCServer } from "./server";
import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";

export class State {
  static fm = false;

  static foreign = false;

  static minSize = 256 * 1024;

  static cacheSize = 4096 * 1024 * 1024;

  static musicQuality = 192000;

  static lyric: NeteaseTypings.LyricData & {
    delay: number;
    idx: number;
  } = { delay: -1.0, idx: 0, time: [0], text: [["~"]], user: [] };

  private static _playing = false;

  static get playing(): boolean {
    return State._playing;
  }

  static set playing(value: boolean) {
    State._playing = value;
    IPCServer.broadcast({
      t: value ? IPCPlayer.play : IPCPlayer.pause,
    });
  }
}

export class PersonalFm {
  static uid: number;

  private static _songs: NeteaseTypings.SongsItem[] = [];

  static async head(): Promise<NeteaseTypings.SongsItem | undefined> {
    if (!this._songs.length) await this._getSongs();
    return this._songs.shift();
  }

  static async next(): Promise<NeteaseTypings.SongsItem | undefined> {
    if (this._songs.length <= 1) await this._getSongs();
    return this._songs[1];
  }

  private static async _getSongs() {
    this._songs.push(...(await NeteaseAPI.personalFm(this.uid)));
  }
}
