import { IPCServer, NeteaseAPI } from ".";
import type { NeteaseTypings } from "api";

export class State {
  static fm = false;

  static minSize = 256 * 1024;

  static musicQuality = 192000;

  static cacheSize = 4096 * 1024 * 1024;

  private static _playing = false;

  static get playing(): boolean {
    return State._playing;
  }

  static set playing(value: boolean) {
    State._playing = value;
    IPCServer.broadcast({
      t: value ? "player.play" : "player.pause",
    });
  }
}

export class PersonalFm {
  private static _songs: NeteaseTypings.SongsItem[] = [];

  static async head(): Promise<NeteaseTypings.SongsItem> {
    if (!this._songs.length) await this._getSongs();
    return this._songs.splice(0, 1)[0];
  }

  static async next(): Promise<NeteaseTypings.SongsItem> {
    if (this._songs.length <= 1) await this._getSongs();
    return this._songs[1];
  }

  private static async _getSongs() {
    this._songs.push(...(await NeteaseAPI.personalFm()));
  }
}
