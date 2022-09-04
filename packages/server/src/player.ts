import { IPCPlayer, IPCWasm } from "@cloudmusic/shared";
import { downloadMusic, getMusicPath, logError } from "./utils";
import type { IPCClientLoadMsg } from "@cloudmusic/shared";
import { IPCServer } from "./server";
import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";
import { PersonalFm } from "./state";
import { STATE } from "./state";
import { TMP_DIR } from "./constant";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

type NativePlayerHdl = unknown;
type NativeMediaSessionHdl = unknown;

interface NativeModule {
  playerEmpty(player: NativePlayerHdl): boolean;
  playerLoad(player: NativePlayerHdl, url: string, play: boolean): boolean;
  playerNew(): NativePlayerHdl;
  playerPause(player: NativePlayerHdl): void;
  playerPlay(player: NativePlayerHdl): boolean;
  playerPosition(player: NativePlayerHdl): number;
  playerSetVolume(player: NativePlayerHdl, level: number): void;
  playerSetSpeed(player: NativePlayerHdl, speed: number): void;
  playerStop(player: NativePlayerHdl): void;
  playerSeek(player: NativePlayerHdl, seekOffset: number): void;

  // mediaSessionHwnd(pid: string): string;
  mediaSessionNew(
    // hwnd: string,
    handler: (type: number) => void,
    path: string
  ): NativeMediaSessionHdl;
  mediaSessionSetMetadata(
    mediaSession: NativeMediaSessionHdl,
    title: string,
    album: string,
    artist: string,
    cover_url: string,
    duration: number
  ): void;
  mediaSessionSetPlayback(
    mediaSession: NativeMediaSessionHdl,
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
  Player.lastPos = pos;

  if (pos > 120 && !prefetchLock) {
    prefetchLock = true;
    prefetch().catch(logError);
  }

  const lpos = pos - STATE.lyric.delay;
  {
    let l = 0;
    let r = STATE.lyric.time.length - 1;
    while (l <= r) {
      const mid = Math.trunc((l + r) / 2);
      if (STATE.lyric.time[mid] <= lpos) l = mid + 1;
      else r = mid - 1;
    }
    if (STATE.lyric.idx !== r) {
      STATE.lyric.idx = r;
      IPCServer.broadcast({ t: IPCPlayer.lyricIndex, idx: Math.max(0, r) });
    }
  }
}

const buildPath = resolve(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "build",
  process.env["CM_NATIVE_MODULE"] as string
);

abstract class PlayerBase {
  id = 0;

  lastPos = 0;

  next?: { id: number; name: string };

  protected _playing = false;

  private _loadtime = 0;

  private _scrobbleArgs?: { dt: number; pid: number };

  protected abstract readonly _wasm: boolean;

  get playing() {
    return this._playing;
  }

  set playing(value: boolean) {
    if (this._playing !== value) {
      this._playing = value;
      this._setPlaying?.();
      IPCServer.broadcast({ t: value ? IPCPlayer.play : IPCPlayer.pause });
    }
  }

  async load(data: IPCClientLoadMsg): Promise<void> {
    const loadtime = Date.now();
    if (loadtime < this._loadtime) return;
    const lastTime = this._loadtime;

    if (this._scrobbleArgs && this.id) {
      const { dt, pid } = this._scrobbleArgs;
      this._scrobbleArgs = undefined;
      const diff = loadtime - lastTime;
      if (diff > 60000) {
        const time = Math.floor(Math.min(diff, dt) / 1000);
        NeteaseAPI.scrobble(this.id, pid, time).catch(logError);
      }
    }

    try {
      const path =
        "url" in data && data.url
          ? data.url
          : await getMusicPath(data.item.id, data.item.name, this._wasm);

      this._loadtime = loadtime;
      this._load(path, data.play, data.item);
    } catch (err) {
      logError(err);
      IPCServer.sendToMaster({ t: IPCPlayer.end, fail: true });
      return;
    }

    this.next = data.next;
    prefetchLock = false;

    this.id = data.item.id;
    if (data.item.id) {
      NeteaseAPI.lyric(data.item.id)
        .then((lyric) => {
          Object.assign(STATE.lyric, lyric, { idx: 0 });
          IPCServer.broadcast({ t: IPCPlayer.lyric, lyric });
        })
        .catch(logError);

      this._scrobbleArgs = {
        dt: data.item.dt,
        pid: data.pid || 0,
      };
    }

    this._loaded?.();
  }

  toggle(): void {
    this._playing ? this.pause() : this.play();
  }

  abstract pause(): void;
  abstract pause(): void;
  abstract play(): void;
  abstract stop(): void;
  abstract speed(speed: number): void;
  abstract volume(level: number): void;
  abstract seek(seekOffset: number): void;
  protected abstract _load(
    path: string,
    play: boolean,
    item: NeteaseTypings.SongsItem
  ): void;
  protected abstract _loaded?(): void; // WASM is sent from webview
  protected abstract _setPlaying?(): void;
  protected abstract wasmOpen?(): void;
}

class WasmPlayer extends PlayerBase {
  protected readonly _wasm = true;

  protected readonly _loaded = undefined;

  protected readonly _setPlaying = undefined;

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

  wasmOpen() {
    setTimeout(
      () => IPCServer.sendToMaster({ t: IPCPlayer.end, reload: true }),
      1024
    );
  }

  protected _load(path: string, play: boolean) {
    IPCServer.sendToMaster({ t: IPCWasm.load, path, play });
  }
}

class NativePlayer extends PlayerBase {
  readonly wasmOpen = undefined;

  protected readonly _wasm = false;

  private readonly _native: NativeModule;

  private readonly _player: NativePlayerHdl;

  private readonly _mediaSession: NativeMediaSessionHdl;

  constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this._native = require(buildPath) as NativeModule;
    this._player = this._native.playerNew();
    const volume = parseInt(process.env["CM_VOLUME"] || "85", 10);
    const speed = parseFloat(process.env["CM_SPEED"] || "1");
    this._native.playerSetVolume(this._player, volume);
    this._native.playerSetSpeed(this._player, speed);

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

    setInterval(() => {
      if (!this._playing) return;
      if (this._native.playerEmpty(this._player)) {
        this.playing = false;
        IPCServer.sendToMaster({ t: IPCPlayer.end });
        return;
      }
      posHandler(this._native.playerPosition(this._player));
    }, 800);
  }

  pause() {
    this._native.playerPause(this._player);
    this.playing = false;
  }

  play() {
    if (this._native.playerPlay(this._player)) this.playing = true;
  }

  stop() {
    this._native.playerStop(this._player);
    this.playing = false;
  }

  speed(speed: number) {
    this._native.playerSetSpeed(this._player, speed);
  }

  volume(level: number) {
    this._native.playerSetVolume(this._player, level);
  }

  seek(seekOffset: number) {
    this._native.playerSeek(this._player, seekOffset);
  }

  protected _load(path: string, play: boolean, item: NeteaseTypings.SongsItem) {
    if (!this._native.playerLoad(this._player, path, play))
      throw Error(`Failed to load ${path}`);
    this.playing = play;

    this._native.mediaSessionSetMetadata(
      this._mediaSession,
      item.name || "",
      item.al?.name || "",
      item.ar?.map((ar) => ar.name).join("/") || "",
      item.al?.picUrl || "",
      item.dt / 1000
    );
  }

  protected _loaded() {
    IPCServer.broadcast({ t: IPCPlayer.loaded });
  }

  protected _setPlaying() {
    const pos = this._native.playerPosition(this._player);
    this._native.mediaSessionSetPlayback(
      this._mediaSession,
      this._playing,
      pos
    );
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Player =
  process.env["CM_WASM"] === "0" ? new NativePlayer() : new WasmPlayer();
