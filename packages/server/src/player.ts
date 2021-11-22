import { downloadMusic, getMusicPath, logError } from "./utils";
import { readdir, stat, unlink } from "fs/promises";
import { IPCServer } from "./server";
import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import { PersonalFm } from "./state";
import { State } from "./state";
import { TMP_DIR } from "./constant";
import { resolve } from "path";

type NativePlayer = unknown;

interface NativeModule {
  playerEmpty(player: NativePlayer): boolean;
  playerLoad(player: NativePlayer, url: string): boolean;
  playerNew(): NativePlayer;
  playerPause(player: NativePlayer): void;
  playerPlay(player: NativePlayer): boolean;
  playerPosition(player: NativePlayer): number;
  playerSetVolume(player: NativePlayer, level: number): void;
  playerStop(player: NativePlayer): void;
}

let prefetchLock = false;

async function prefetch() {
  const id = State.fm ? (await PersonalFm.next())?.id || 0 : Player.next;
  const idS = `${id}`;
  if (idS === "0" || MusicCache.get(idS)) return;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return;

  const path = resolve(TMP_DIR, idS);
  void downloadMusic(url, idS, path, !State.fm, md5);
  void NeteaseAPI.lyric(id);
}

export function posHandler(pos: number): void {
  if (pos > 120 && !prefetchLock) {
    prefetchLock = true;
    void prefetch();
  }

  const lpos = pos - State.lyric.delay;
  while (State.lyric.o.time[State.lyric.oi] <= lpos) ++State.lyric.oi;
  while (State.lyric.t.time[State.lyric.ti] <= lpos) ++State.lyric.ti;
  IPCServer.broadcast({
    t: "player.lyricIndex",
    oi: State.lyric.oi - 1,
    ti: State.lyric.ti - 1,
  });
}

class WasmPlayer {
  load(path: string) {
    IPCServer.sendToMaster({ t: "wasm.load", path });
  }

  pause() {
    IPCServer.sendToMaster({ t: "wasm.pause" });
  }

  play() {
    IPCServer.sendToMaster({ t: "wasm.play" });
  }

  stop() {
    IPCServer.sendToMaster({ t: "wasm.stop" });
  }

  volume(level: number) {
    IPCServer.sendToMaster({ t: "wasm.volume", level });
  }
}

export class Player {
  static next = 0;

  private static _dt = 0;

  private static _id = 0;

  private static _pid = 0;

  private static _time = 0;

  private static _loadtime = 0;

  private static _player: NativePlayer;

  private static _wasm?: WasmPlayer;

  private static _native?: NativeModule;

  static init(wasm: boolean, name = "", volume?: number): void {
    if (this._wasm || this._native) return;
    if (!wasm) {
      const path = resolve(__dirname, "..", "build", name);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._native = require(path) as NativeModule;
      this._player = this._native.playerNew();
      if (volume) this._native.playerSetVolume(this._player, volume);

      setInterval(() => {
        if (!State.playing) return;
        if (Player.empty()) {
          State.playing = false;
          IPCServer.sendToMaster({ t: "player.end" });
          return;
        }
        posHandler(Player.position());
      }, 800);
    } else this._wasm = new WasmPlayer();

    setInterval(
      () =>
        void readdir(TMP_DIR).then((files) => {
          for (const file of files)
            if (file !== `${this._id}`) {
              const path = resolve(TMP_DIR, file);
              void stat(path).then(({ mtime }) => {
                if (Date.now() - mtime.getTime() > 480000)
                  unlink(path).catch(logError);
              });
            }
        }),
      // 1000 * 60 * 8 = 480000
      480000
    );
  }

  static empty(): boolean {
    return this._native ? this._native.playerEmpty(this._player) : true;
  }

  static async load(
    data:
      | { url: string; local: true }
      | { dt: number; id: number; pid: number; next: number | undefined }
  ): Promise<void> {
    const loadtime = Date.now();
    if (loadtime < this._loadtime) {
      this._failedEnd();
      return;
    }
    this._loadtime = loadtime;

    let path: string | void = undefined;
    if ("local" in data && data.local) path = data.url;
    else if ("id" in data && data.id)
      path = await getMusicPath(data.id, !!this._wasm);
    if (!path) {
      this._failedEnd();
      return;
    }

    if (this._native) {
      if (!this._native.playerLoad(this._player, path)) {
        this._failedEnd();
        return;
      }
      IPCServer.broadcast({ t: "player.loaded" });
    } else if (this._wasm) {
      this._wasm.load(path);
    }

    this.next = "next" in data ? data["next"] ?? 0 : 0;
    State.playing = true;
    prefetchLock = false;

    if ("id" in data) {
      void NeteaseAPI.lyric(data.id).then((l) => {
        Object.assign(State.lyric, l, { oi: 0, ti: 0 });
        IPCServer.broadcast({ t: "player.lyric", lyric: { o: l.o, t: l.t } });
      });
    }

    const pTime = this._time;
    this._time = Date.now();

    if (this._id) {
      const diff = this._time - pTime;
      if (diff > 60000 && this._dt > 60000) {
        const time = Math.floor(Math.min(diff, this._dt) / 1000);
        void NeteaseAPI.scrobble(this._id, this._pid, time);
      }
    }

    this._dt = "dt" in data ? data.dt : 0;
    this._id = "id" in data ? data.id : 0;
    this._pid = "pid" in data ? data.pid : 0;
  }

  static pause(): void {
    this._native?.playerPause(this._player);
    this._wasm?.pause();
    State.playing = false;
  }

  static play(): void {
    if (this._native?.playerPlay(this._player)) State.playing = true;
    this._wasm?.play();
  }

  static position(): number {
    return this._native ? this._native.playerPosition(this._player) : 0;
  }

  static stop(): void {
    this._native?.playerStop(this._player);
    this._wasm?.stop();
    State.playing = false;
  }

  static volume(level: number): void {
    this._native?.playerSetVolume(this._player, level);
    this._wasm?.volume(level);
  }

  static wasmOpen(): void {
    if (this._wasm) setTimeout(() => this._failedEnd(), 1024);
  }

  private static _failedEnd(): void {
    IPCServer.sendToMaster({ t: "player.end", fail: true });
  }
}
