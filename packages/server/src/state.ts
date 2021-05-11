import { IPCServer } from ".";

export class State {
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
