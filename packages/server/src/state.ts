import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";

export const STATE = {
  fm: false,
  foreign: process.env["CM_FOREIGN"] === "1",
  minSize: 256 * 1024,
  cacheSize: parseInt(<string>process.env["CM_MUSIC_CACHE_SIZE"]),
  musicQuality: parseInt(<string>process.env["CM_MUSIC_QUALITY"]),
  lyric: <NeteaseTypings.LyricData & { delay: number; idx: number }>{
    delay: -1.0,
    idx: 0,
    time: [0],
    text: [["~", "~", "~"]],
    user: [],
  },
};

class PersonalFm {
  uid = 0;

  #songs: NeteaseTypings.SongsItem[] = [];

  async head(): Promise<NeteaseTypings.SongsItem | undefined> {
    if (!this.#songs.length) await this.#getSongs();
    return this.#songs.shift();
  }

  async next(): Promise<NeteaseTypings.SongsItem | undefined> {
    if (this.#songs.length <= 1) await this.#getSongs();
    return this.#songs[1];
  }

  async #getSongs() {
    this.#songs.push(...(await NeteaseAPI.personalFm(this.uid)));
  }
}

export const PERSONAL_FM = new PersonalFm();
