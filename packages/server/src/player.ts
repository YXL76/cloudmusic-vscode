import { IPCPlayer, IPCWasm } from "@cloudmusic/shared";
import { basename, resolve } from "path";
import { downloadMusic, getMusicPath } from "./utils";
import { IPCServer } from "./server";
import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";
import { PersonalFm } from "./state";
import { State } from "./state";
import { TMP_DIR } from "./constant";

type NativePlayer = unknown;
type NativeMediaSession = unknown;

interface NativeModule {
  playerEmpty(player: NativePlayer): boolean;
  playerLoad(player: NativePlayer, url: string): boolean;
  playerNew(): NativePlayer;
  playerPause(player: NativePlayer): void;
  playerPlay(player: NativePlayer): boolean;
  playerPosition(player: NativePlayer): number;
  playerSetVolume(player: NativePlayer, level: number): void;
  playerSetSpeed(player: NativePlayer, speed: number): void;
  playerStop(player: NativePlayer): void;

  mediaSessionHwnd(pid: string): string;
  mediaSessionNew(
    hwnd: string,
    play_handler: () => void,
    pause_handler: () => void,
    toggle_handler: () => void,
    next_handler: () => void,
    previous_handler: () => void,
    stop_handler: () => void
  ): NativeMediaSession;
  mediaSessionSetMetadata(
    mediaSession: NativeMediaSession,
    title: string,
    album: string,
    artist: string,
    cover_url: string,
    duration: number
  ): void;
  mediaSessionSetPlayback(
    mediaSession: NativeMediaSession,
    playing: boolean,
    position: number
  ): void;
}

let prefetchLock = false;

async function prefetch() {
  const { id, name } = (State.fm ? await PersonalFm.next() : Player.next) || {};
  if (!id || !name) return;
  const idS = `${id}`;
  if (MusicCache.get(idS)) return;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return;
  const path = resolve(TMP_DIR, idS);

  let cache;
  if (!State.fm) cache = { id: idS, name, path, md5 };
  void downloadMusic(url, name, cache);
  void NeteaseAPI.lyric(id);
}

export function posHandler(pos: number): void {
  if (pos > 120 && !prefetchLock) {
    prefetchLock = true;
    void prefetch();
  }

  const lpos = pos - State.lyric.delay;
  const prev = State.lyric.idx;
  while (State.lyric.time[State.lyric.idx] <= lpos) ++State.lyric.idx;
  if (prev !== State.lyric.idx)
    IPCServer.broadcast({ t: IPCPlayer.lyricIndex, idx: State.lyric.idx - 1 });
}

class WasmPlayer {
  load(path: string) {
    IPCServer.sendToMaster({ t: IPCWasm.load, path });
  }

  pause() {
    IPCServer.sendToMaster({ t: IPCWasm.pause });
  }

  play() {
    IPCServer.sendToMaster({ t: IPCWasm.play });
  }

  stop() {
    IPCServer.sendToMaster({ t: IPCWasm.stop });
  }

  speed(speed: number) {
    IPCServer.sendToMaster({ t: IPCWasm.speed, speed });
  }

  volume(level: number) {
    IPCServer.sendToMaster({ t: IPCWasm.volume, level });
  }
}

export class Player {
  static next?: { id: number; name: string };

  static id = 0;

  private static _dt = 0;

  private static _pid = 0;

  private static _time = 0;

  private static _loadtime = 0;

  private static _wasm?: WasmPlayer;

  private static _native?: NativeModule;

  private static _player: NativePlayer;

  private static _mediaSession: NativeMediaSession;

  private static _playing = false;

  static get playing() {
    return this._playing;
  }

  static set playing(value: boolean) {
    if (this._playing !== value) {
      this._playing = value;
      if (this._native) {
        const pos = this._native.playerPosition(this._player);
        this._native.mediaSessionSetPlayback(this._mediaSession, value, pos);
      }
      IPCServer.broadcast({ t: value ? IPCPlayer.play : IPCPlayer.pause });
    }
  }

  static init(): void {
    if (this._wasm || this._native) return;
    if (process.env["CM_WASM"] === "0") {
      const name = process.env["CM_NATIVE_MODULE"] as string;
      const path = resolve(__dirname, "..", "build", name);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._native = require(path) as NativeModule;
      this._player = this._native.playerNew();
      const volume = parseInt(process.env["CM_VOLUME"] || "85", 10);
      const speed = parseFloat(process.env["CM_SPEED"] || "1");
      this._native.playerSetVolume(this._player, volume);
      this._native.playerSetSpeed(this._player, speed);

      this.mediaSession(process.env["VSCODE_PID"], true);

      setInterval(() => {
        if (!this._playing) return;
        if (Player.empty()) {
          this.playing = false;
          IPCServer.sendToMaster({ t: IPCPlayer.end });
          return;
        }
        posHandler(Player.position());
      }, 800);
    } else this._wasm = new WasmPlayer();
  }

  static mediaSession(pid?: string, init?: true) {
    if (!this._native) return;
    let hwnd = "";
    if (process.platform === "win32" && pid)
      hwnd = this._native.mediaSessionHwnd(pid);
    if (init || hwnd) {
      this._mediaSession = this._native.mediaSessionNew(
        hwnd,
        this.play.bind(this),
        this.pause.bind(this),
        this.toggle.bind(this),
        () => IPCServer.sendToMaster({ t: IPCPlayer.next }),
        () => IPCServer.sendToMaster({ t: IPCPlayer.previous }),
        this.stop.bind(this)
      );
    }
  }

  static empty(): boolean {
    return this._native ? this._native.playerEmpty(this._player) : true;
  }

  static async load(
    data:
      | { url: string; local: true }
      | {
          item: NeteaseTypings.SongsItem;
          pid: number;
          next?: { id: number; name: string };
        }
  ): Promise<void> {
    const loadtime = Date.now();
    if (loadtime < this._loadtime) {
      this._failedEnd();
      return;
    }
    this._loadtime = loadtime;

    let path: string | void = undefined;
    const local = "local" in data && data.local;
    const network = "item" in data && data.item;
    if (local) path = data.url;
    else if (network)
      path = await getMusicPath(data.item.id, data.item.name, !!this._wasm);

    if (!path) {
      this._failedEnd();
      return;
    }

    if (this._native) {
      if (!this._native.playerLoad(this._player, path)) {
        this._failedEnd();
        return;
      }
      IPCServer.broadcast({ t: IPCPlayer.loaded });

      if (local) {
        this._native.mediaSessionSetMetadata(this._mediaSession, basename(path), "", "", "", 0); // eslint-disable-line
      } else if (network) {
        this._native.mediaSessionSetMetadata(
          this._mediaSession,
          data.item.name,
          data.item.al.name,
          data.item.ar.map((ar) => ar.name).join("/"),
          data.item.al.picUrl,
          data.item.dt / 1000
        );
      }
    } else if (this._wasm) {
      this._wasm.load(path);
    }

    this.next = network ? data["next"] : undefined;
    this.playing = true;
    prefetchLock = false;

    if (network)
      void NeteaseAPI.lyric(data.item.id).then((lyric) => {
        Object.assign(State.lyric, lyric, { idx: 0 });
        IPCServer.broadcast({ t: IPCPlayer.lyric, lyric });
      });

    const pTime = this._time;
    this._time = Date.now();

    if (this.id) {
      const diff = this._time - pTime;
      if (diff > 60000 && this._dt > 60000) {
        const time = Math.floor(Math.min(diff, this._dt) / 1000);
        void NeteaseAPI.scrobble(this.id, this._pid, time);
      }
    }

    if (network) {
      this.id = data.item.id;
      this._dt = data.item.dt;
      this._pid = data.pid;
    } else {
      this.id = 0;
      this._dt = 0;
      this._pid = 0;
    }
  }

  static toggle(): void {
    this._playing ? this.pause() : this.play();
  }

  static pause(): void {
    this._native?.playerPause(this._player);
    this._wasm?.pause();
    this.playing = false;
  }

  static play(): void {
    if (this._native?.playerPlay(this._player)) this.playing = true;
    this._wasm?.play();
  }

  static position(): number {
    return this._native?.playerPosition(this._player) || 0;
  }

  static stop(): void {
    this._native?.playerStop(this._player);
    this._wasm?.stop();
    this.playing = false;
  }

  static speed(speed: number): void {
    this._native?.playerSetSpeed(this._player, speed);
    this._wasm?.speed(speed);
  }

  static volume(level: number): void {
    this._native?.playerSetVolume(this._player, level);
    this._wasm?.volume(level);
  }

  static wasmOpen(): void {
    if (this._wasm) setTimeout(() => this._failedEnd(), 1024);
  }

  private static _failedEnd(): void {
    IPCServer.sendToMaster({ t: IPCPlayer.end, fail: true });
  }
}
