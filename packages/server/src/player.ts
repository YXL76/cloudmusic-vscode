import { IPCPlayer, IPCWasm } from "@cloudmusic/shared";
import { getMusicPath, getMusicPathClean, logError } from "./utils.js";
import type { IPCClientLoadMsg } from "@cloudmusic/shared";
import { IPC_SRV } from "./server.js";
import type { NeteaseTypings } from "api";
import { STATE } from "./state.js";
import { TMP_DIR } from "./constant.js";
import { fileURLToPath } from "node:url";
import { lyric } from "./api/netease/song.js";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { scrobble } from "./api/netease/account.js";

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
    duration: number,
  ): void;
  mediaSessionSetPlayback(mediaSession: NativeMediaSessionHdl, playing: boolean, position: number): void;
}

function prefetch(next: { id?: number; name?: string }): void {
  const { id, name } = next || {};
  if (!id || !name) return;
  getMusicPathClean(id, name).catch(logError);
  lyric(id).catch(logError);
}

export function posHandler(pos: number): void {
  PLAYER.lastPos = pos;

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
  lastPos = 0;

  #prefetchTimer?: NodeJS.Timeout;

  #loadtime = 0;

  #scrobbleArgs?: { id: number; dt: number; pid: number };

  #playing = false;

  protected abstract readonly _getPath: (id: number, name: string) => Promise<string>;

  get playing() {
    return this.#playing;
  }

  set playing(value: boolean) {
    if (this.#playing !== value) {
      this.#playing = value;
      this._setPlaying?.(value);
      IPC_SRV.broadcast({ t: value ? IPCPlayer.play : IPCPlayer.pause });
    }
  }

  async load(data: IPCClientLoadMsg): Promise<void> {
    const loadtime = Date.now();
    if (loadtime < this.#loadtime) return;
    const lastTime = this.#loadtime;

    if (this.#scrobbleArgs) {
      const { id, dt, pid } = this.#scrobbleArgs;
      this.#scrobbleArgs = undefined;
      const diff = loadtime - lastTime;
      if (diff > 60000) {
        const time = Math.floor(Math.min(diff, dt) / 1000);
        scrobble(id, pid, time).catch(logError);
      }
      setTimeout(() => void rm(resolve(TMP_DIR, `${id}`), { force: true }).catch(logError));
    }

    if (this.#prefetchTimer) clearTimeout(this.#prefetchTimer);
    this.#prefetchTimer = data.next ? setTimeout(prefetch, 120000, data.next) : undefined;

    try {
      const path = "url" in data && data.url ? data.url : await this._getPath(data.item.id, data.item.name);
      this.#loadtime = loadtime;
      this._load(path, data.play, data.item, data.seek);
    } catch (err) {
      logError(err);
      return IPC_SRV.sendToMaster({ t: IPCPlayer.end, fail: true });
    }

    if (data.item.id) {
      lyric(data.item.id)
        .then((lyric) => {
          Object.assign(STATE.lyric, lyric, { idx: 0 });
          IPC_SRV.broadcast({ t: IPCPlayer.lyric, lyric });
        })
        .catch(logError);

      this.#scrobbleArgs = { id: data.item.id, dt: data.item.dt, pid: data.pid || 0 };
    } else {
      const lyric: NeteaseTypings.LyricData = { time: [0], text: [["~", "~", "~"]], user: [] };
      Object.assign(STATE.lyric, lyric, { idx: 0 });
      IPC_SRV.broadcast({ t: IPCPlayer.lyric, lyric });
    }

    this._loaded?.();
  }

  toggle(): void {
    this.#playing ? this.pause() : this.play();
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
  protected abstract _setPlaying?(playing: boolean): void;
  protected abstract wasmOpen?(): void;
}

class WasmPlayer extends PlayerBase {
  protected readonly _getPath = getMusicPathClean;

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

  protected readonly _getPath = getMusicPath;

  readonly #native: NativeModule;

  readonly #player: NativePlayerHdl;

  readonly #mediaSession: NativeMediaSessionHdl;

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
    const enum Type {
      play,
      pause,
      toggle,
      next,
      previous,
      stop,
    }
    this.#mediaSession = this.#native.mediaSessionNew(
      (type: Type) => {
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
      },
      buildPath.replace(".node", "-media"),
    );

    setInterval(() => {
      if (!this.playing) return;
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
      item.dt / 1000,
    );
  }

  protected _loaded() {
    setTimeout(() => IPC_SRV.broadcast({ t: IPCPlayer.loaded }), 16);
  }

  protected _setPlaying(playing: boolean) {
    const pos = this.#native.playerPosition(this.#player);
    this.#native.mediaSessionSetPlayback(this.#mediaSession, playing, pos);
  }
}

export const PLAYER = process.env["CM_WASM"] === "0" ? new NativePlayer() : new WasmPlayer();
