import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";

export class State {
  static fm = false;

  static foreign = process.env["CM_FOREIGN"] === "1";

  static minSize = 256 * 1024;

  static cacheSize = parseInt(process.env["CM_MUSIC_CACHE_SIZE"] as string);

  static musicQuality = parseInt(process.env["CM_MUSIC_QUALITY"] as string);

  static lyric: NeteaseTypings.LyricData & {
    delay: number;
    idx: number;
  } = { delay: -1.0, idx: 0, time: [0], text: [["~", "~", "~"]], user: [] };
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
