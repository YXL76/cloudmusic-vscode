import { IPCEvent } from "@cloudmusic/shared";
import { broadcast } from ".";

export class State {
  private static _playing = false;

  static get playing(): boolean {
    return State._playing;
  }

  static set playing(value: boolean) {
    if (value !== this._playing) {
      State._playing = value;
      broadcast({ t: value ? IPCEvent.Play.play : IPCEvent.Play.pause });
    }
  }
}
