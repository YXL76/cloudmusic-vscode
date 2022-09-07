import { IPCPlayer, IPCWasm } from "@cloudmusic/shared";
import { downloadMusic, getMusicPath, logError } from "./utils";
import type { IPCClientLoadMsg } from "@cloudmusic/shared";
import { IPC_SRV } from "./server";
import { MUSIC_CACHE } from "./cache";
import { NeteaseAPI } from "./api";
import type { NeteaseTypings } from "api";
import { PERSONAL_FM } from "./state";
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
  mediaSessionNew(handler: (type: number) => void, path: string): NativeMediaSessionHdl;
  mediaSessionSetMetadata(
    mediaSession: NativeMediaSessionHdl,
    title: string,
    album: string,
    artist: string,
    cover_url: string,
    duration: number
  ): void;
  mediaSessionSetPlayback(mediaSession: NativeMediaSessionHdl, playing: boolean, position: number): void;
}

let prefetchLock = false;

async function prefetch() {
  const { id, name } = (STATE.fm ? await PERSONAL_FM.next() : PLAYER.next) || {};
  if (!id || !name) return;
  const idS = `${id}`;
  if (MUSIC_CACHE.get(idS)) return;

  const { url, md5 } = await NeteaseAPI.songUrl(id);
  if (!url) return;
  const path = resolve(TMP_DIR, idS);

  let cache;
  if (!STATE.fm) cache = { id: idS, name: `${name}-${idS}`, path, md5 };
  downloadMusic(url, path, cache);
  NeteaseAPI.lyric(id).catch(logError);
}

export function posHandler(pos: number): void {
  PLAYER.lastPos = pos;

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
      IPC_SRV.broadcast({ t: IPCPlayer.lyricIndex, idx: Math.max(0, r) });
    }
  }
}

abstract class PlayerBase {
  id = 0;

  lastPos = 0;

  next?: { id: number; name: string };

  #loadtime = 0;

  #scrobbleArgs?: { dt: number; pid: number };

  protected _playing = false;

  protected abstract readonly _wasm: boolean;

  get playing() {
    return this._playing;
  }

  set playing(value: boolean) {
    if (this._playing !== value) {
      this._playing = value;
      this._setPlaying?.();
      IPC_SRV.broadcast({ t: value ? IPCPlayer.play : IPCPlayer.pause });
    }
  }

  async load(data: IPCClientLoadMsg): Promise<void> {
    const loadtime = Date.now();
    if (loadtime < this.#loadtime) return;
    const lastTime = this.#loadtime;

    if (this.#scrobbleArgs && this.id) {
      const { dt, pid } = this.#scrobbleArgs;
      this.#scrobbleArgs = undefined;
      const diff = loadtime - lastTime;
      if (diff > 60000) {
        const time = Math.floor(Math.min(diff, dt) / 1000);
        NeteaseAPI.scrobble(this.id, pid, time).catch(logError);
      }
    }

    try {
      const path = "url" in data && data.url ? data.url : await getMusicPath(data.item.id, data.item.name, this._wasm);
      this.#loadtime = loadtime;
      this._load(path, data.play, data.item, data.seek);
    } catch (err) {
      logError(err);
      return IPC_SRV.sendToMaster({ t: IPCPlayer.end, fail: true });
    }

    this.next = data.next;
    prefetchLock = false;

    this.id = data.item.id;
    if (data.item.id) {
      NeteaseAPI.lyric(data.item.id)
        .then((lyric) => {
          Object.assign(STATE.lyric, lyric, { idx: 0 });
          IPC_SRV.broadcast({ t: IPCPlayer.lyric, lyric });
        })
        .catch(logError);

      this.#scrobbleArgs = { dt: data.item.dt, pid: data.pid || 0 };
    } else {
      const lyric: NeteaseTypings.LyricData = { time: [0], text: [["~", "~", "~"]], user: [] };
      Object.assign(STATE.lyric, lyric, { idx: 0 });
      IPC_SRV.broadcast({ t: IPCPlayer.lyric, lyric });
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
  protected abstract _load(path: string, play: boolean, item: NeteaseTypings.SongsItem, seek?: number): void;
  protected abstract _loaded?(): void; // WASM is sent from webview
  protected abstract _setPlaying?(): void;
  protected abstract wasmOpen?(): void;
}

class WasmPlayer extends PlayerBase {
  protected readonly _wasm = true;

  protected readonly _loaded = undefined;

  protected readonly _setPlaying = undefined;

  pause() {
    IPC_SRV.sendToMaster({ t: IPCWasm.pause });
  }

  play() {
    IPC_SRV.sendToMaster({ t: IPCWasm.play });
  }

  stop() {
    IPC_SRV.sendToMaster({ t: IPCWasm.stop });
  }

  speed(speed: number) {
    IPC_SRV.sendToMaster({ t: IPCWasm.speed, speed });
  }

  volume(level: number) {
    IPC_SRV.sendToMaster({ t: IPCWasm.volume, level });
  }

  seek(seekOffset: number) {
    IPC_SRV.sendToMaster({ t: IPCWasm.seek, seekOffset });
  }

  wasmOpen() {
    setTimeout(() => IPC_SRV.sendToMaster({ t: IPCPlayer.end, pause: !this.playing, reloadNseek: this.lastPos }), 1024);
  }

  protected _load(path: string, play: boolean, _: NeteaseTypings.SongsItem, seek?: number) {
    IPC_SRV.sendToMaster({ t: IPCWasm.load, path, play, seek });
  }
}

class NativePlayer extends PlayerBase {
  readonly wasmOpen = undefined;

  readonly #native: NativeModule;

  readonly #player: NativePlayerHdl;

  readonly #mediaSession: NativeMediaSessionHdl;

  protected readonly _wasm = false;

  constructor() {
    super();
    const module = <string>process.env["CM_NATIVE_MODULE"];
    const buildPath = resolve(fileURLToPath(import.meta.url), "..", "..", "build", module);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.#native = <NativeModule>require(buildPath);
    this.#player = this.#native.playerNew();
    const volume = parseInt(process.env["CM_VOLUME"] || "85", 10);
    const speed = parseFloat(process.env["CM_SPEED"] || "1");
    this.#native.playerSetVolume(this.#player, volume);
    this.#native.playerSetSpeed(this.#player, speed);

    /* let hwnd = "";
    if (process.platform === "win32" && pid)
      hwnd = this.#native.mediaSessionHwnd(pid);
    if (init || hwnd) {
    } */
    this.#mediaSession = this.#native.mediaSessionNew((type) => {
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
          return this.play();
        case Type.pause:
          return this.pause();
        case Type.toggle:
          return this.toggle();
        case Type.next:
          return IPC_SRV.sendToMaster({ t: IPCPlayer.next });
        case Type.previous:
          return IPC_SRV.sendToMaster({ t: IPCPlayer.previous });
        case Type.stop:
          return this.stop();
      }
    }, buildPath.replace(".node", "-media"));

    setInterval(() => {
      if (!this._playing) return;
      if (this.#native.playerEmpty(this.#player)) {
        this.playing = false;
        return IPC_SRV.sendToMaster({ t: IPCPlayer.end });
      }
      posHandler(this.#native.playerPosition(this.#player));
    }, 800);
  }

  pause() {
    this.#native.playerPause(this.#player);
    this.playing = false;
  }

  play() {
    if (this.#native.playerPlay(this.#player)) this.playing = true;
  }

  stop() {
    this.#native.playerStop(this.#player);
    this.playing = false;
  }

  speed(speed: number) {
    this.#native.playerSetSpeed(this.#player, speed);
  }

  volume(level: number) {
    this.#native.playerSetVolume(this.#player, level);
  }

  seek(seekOffset: number) {
    this.#native.playerSeek(this.#player, seekOffset);
  }

  protected _load(path: string, play: boolean, item: NeteaseTypings.SongsItem) {
    if (!this.#native.playerLoad(this.#player, path, play)) throw Error(`Failed to load ${path}`);
    this.playing = play;

    this.#native.mediaSessionSetMetadata(
      this.#mediaSession,
      item.name || "",
      item.al?.name || "",
      item.ar?.map(({ name }) => name).join("/") || "",
      item.al?.picUrl || "",
      item.dt / 1000
    );
  }

  protected _loaded() {
    IPC_SRV.broadcast({ t: IPCPlayer.loaded });
  }

  protected _setPlaying() {
    const pos = this.#native.playerPosition(this.#player);
    this.#native.mediaSessionSetPlayback(this.#mediaSession, this._playing, pos);
  }
}

export const PLAYER = process.env["CM_WASM"] === "0" ? new NativePlayer() : new WasmPlayer();
