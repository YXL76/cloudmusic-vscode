import { IPCPlayer, IPCWasm } from "@cloudmusic/shared";
import { basename, resolve } from "node:path";
import { downloadMusic, getMusicPath, logError } from "./utils";
import { IPCServer } from "./server";
import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";
import { PersonalFm } from "./state";
import { STATE } from "./state";
import { TMP_DIR } from "./constant";
import { fileURLToPath } from "node:url";

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
  playerSeek(player: NativePlayer, seekOffset: number): void;

  // mediaSessionHwnd(pid: string): string;
  mediaSessionNew(
    // hwnd: string,
    handler: (type: number) => void,
    path: string
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
  const { id, name } = (STATE.fm ? await PersonalFm.next() : Player.next) || {};
  if (!id || !name) return;
  const idS = `${id}`;
  if (MusicCache.get(idS)) return;

  const { url, md5 } = await NeteaseAPI.songUrl(id);
  if (!url) return;
  const path = resolve(TMP_DIR, idS);

  let cache;
  if (!STATE.fm) cache = { id: idS, name: `${name}-${idS}`, path, md5 };
  downloadMusic(url, path, cache);
  NeteaseAPI.lyric(id).catch(logError);
}

export function posHandler(pos: number): void {
  if (pos > 120 && !prefetchLock) {
    prefetchLock = true;
    prefetch().catch(logError);
  }

  const lpos = pos - STATE.lyric.delay;
  const prev = STATE.lyric.idx;
  while (STATE.lyric.time[STATE.lyric.idx] <= lpos) ++STATE.lyric.idx;
  if (prev !== STATE.lyric.idx)
    IPCServer.broadcast({ t: IPCPlayer.lyricIndex, idx: STATE.lyric.idx - 1 });
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

  seek(seekOffset: number) {
    IPCServer.sendToMaster({ t: IPCWasm.seek, seekOffset });
  }
}

const buildPath = resolve(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "build",
  process.env["CM_NATIVE_MODULE"] as string
);

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

  static init() {
    if (this._wasm || this._native) return;
    if (process.env["CM_WASM"] === "0") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._native = require(buildPath) as NativeModule;
      this._player = this._native.playerNew();
      const volume = parseInt(process.env["CM_VOLUME"] || "85", 10);
      const speed = parseFloat(process.env["CM_SPEED"] || "1");
      this._native.playerSetVolume(this._player, volume);
      this._native.playerSetSpeed(this._player, speed);

      this.mediaSession(/* process.env["VSCODE_PID"], true */);

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

  static mediaSession(/* pid?: string, init?: true*/) {
    if (!this._native) return;
    /* let hwnd = "";
    if (process.platform === "win32" && pid)
      hwnd = this._native.mediaSessionHwnd(pid);
    if (init || hwnd) {
    } */
    this._mediaSession = this._native.mediaSessionNew((type) => {
      const enum Type {
        play,
        pause,
        toggle,
        next,
        previous,
        stop,
      }
      switch (type) {
        case Type.play:
          this.play();
          break;
        case Type.pause:
          this.pause();
          break;
        case Type.toggle:
          this.toggle();
          break;
        case Type.next:
          IPCServer.sendToMaster({ t: IPCPlayer.next });
          break;
        case Type.previous:
          IPCServer.sendToMaster({ t: IPCPlayer.previous });
          break;
        case Type.stop:
          this.stop();
      }
    }, buildPath.replace(".node", "-media"));
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

    let path: string;
    const local = "local" in data && data.local;
    const network = "item" in data && data.item;
    try {
      if (local) path = data.url;
      else if (network) {
        path = await getMusicPath(data.item.id, data.item.name, !!this._wasm);
      } else throw Error;
    } catch (err) {
      logError(err);
      this._failedEnd();
      return;
    }

    if (this._native) {
      if (!this._native.playerLoad(this._player, path)) {
        this._failedEnd();
        return;
      }

      if (local) {
        this._native.mediaSessionSetMetadata(this._mediaSession, basename(path), "", "", "", 0); // eslint-disable-line
      } else if (network) {
        this._native.mediaSessionSetMetadata(
          this._mediaSession,
          data.item.name || "",
          data.item.al?.name || "",
          data.item.ar?.map((ar) => ar.name).join("/") || "",
          data.item.al?.picUrl || "",
          data.item.dt / 1000
        );
      }
    } else if (this._wasm) {
      this._wasm.load(path);
    }

    this.next = network ? data["next"] : undefined;
    this.playing = true;
    prefetchLock = false;

    if (network) {
      NeteaseAPI.lyric(data.item.id)
        .then((lyric) => {
          Object.assign(STATE.lyric, lyric, { idx: 0 });
          IPCServer.broadcast({ t: IPCPlayer.lyric, lyric });
        })
        .catch(logError);
    }

    const pTime = this._time;
    this._time = Date.now();

    if (this.id) {
      const diff = this._time - pTime;
      if (diff > 60000) {
        const time = Math.floor(Math.min(diff, this._dt) / 1000);
        NeteaseAPI.scrobble(this.id, this._pid, time).catch(logError);
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

    if (this._native) {
      // WASM is sent from webview
      IPCServer.broadcast({ t: IPCPlayer.loaded });
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

  static seek(seekOffset: number): void {
    this._native?.playerSeek(this._player, seekOffset);
    this._wasm?.seek(seekOffset);
  }

  static wasmOpen(): void {
    if (this._wasm) setTimeout(() => this._failedEnd(), 1024);
  }

  private static _failedEnd(): void {
    IPCServer.sendToMaster({ t: IPCPlayer.end, fail: true });
  }
}
