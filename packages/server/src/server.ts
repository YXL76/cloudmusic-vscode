import { API_CACHE, LYRIC_CACHE, MUSIC_CACHE } from "./cache.js";
import { IPCApi, IPCControl, IPCPlayer, IPCQueue, ipcDelimiter } from "@cloudmusic/shared";
import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import type { NeteaseAPICMsg, NeteaseAPISMsg } from "./index.js";
import { PLAYER, posHandler } from "./player.js";
import { RETAIN_FILE, ipcBroadcastServerPath, ipcServerPath } from "./constant.js";
import type { Server, Socket } from "node:net";
import { downloadMusic, logError } from "./utils.js";
import { readFile, writeFile } from "node:fs/promises";
import { API_CONFIG } from "./api/helper.js";
import { NeteaseAPI } from "./api/index.js";
import { STATE } from "./state.js";
import { broadcastProfiles } from "./api/netease/helper.js";
import { createServer } from "node:net";
import { rmSync } from "node:fs";

class IPCServer {
  #first = true;

  #retain: unknown[] = [];

  #retainState = false;

  #timer?: NodeJS.Timeout;

  readonly #sockets = new Set<Socket>();

  readonly #buffer = new WeakMap<Socket, string>();

  readonly #server: Server;

  constructor() {
    readFile(RETAIN_FILE)
      .then((buf) => (this.#retain = <unknown[]>JSON.parse(buf.toString())))
      .catch(logError);

    rmSync(ipcServerPath, { recursive: true, force: true });

    this.#server = createServer((socket) => {
      if (this.#timer) {
        clearTimeout(this.#timer);
        this.#timer = undefined;
      }
      this.#sockets.add(socket);
      this.#buffer.set(socket, "");

      socket
        .setEncoding("utf8")
        .on("data", (data) => {
          const buffer = (this.#buffer.get(socket) ?? "") + data.toString();

          const msgs = buffer.split(ipcDelimiter);
          this.#buffer.set(socket, msgs.pop() ?? "");
          for (const msg of msgs) this.#handler(<IPCClientMsg | NeteaseAPICMsg<"album">>JSON.parse(msg), socket);
        })
        .on("close", (/* err */) => {
          MUSIC_CACHE.store().catch(logError);
          const isMaster = this.#master === socket;

          socket?.destroy();
          this.#sockets.delete(socket);
          this.#buffer.delete(socket);

          if (this.#sockets.size) {
            this._setMaster();
            // Master was gone, the wasm player was destroyed
            // So we need to recreate it on new master
            if (isMaster) PLAYER.wasmOpen?.();
          } else this.#suspend();
        })
        .on("error", logError);

      this._setMaster();

      if (this.#sockets.size === 1) {
        if (this.#first) this.#first = false;
        else this.#resume(socket);
      } else {
        this.sendToMaster({ t: IPCControl.new });
        this.send(socket, { t: PLAYER.playing ? IPCPlayer.play : IPCPlayer.pause });
      }
    })
      .on("error", (e) => logError(e))
      .listen(ipcServerPath);
  }

  get #master(): Socket | undefined {
    const [socket] = this.#sockets;
    return socket;
  }

  stop() {
    this.#server.close(() => {
      for (const socket of this.#sockets) socket?.destroy();
      this.#sockets.clear();
    });
  }

  send(socket: Socket, data: IPCServerMsg | NeteaseAPISMsg<"album">) {
    socket.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  sendToMaster(data: IPCServerMsg): void {
    this.#master?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  broadcast(data: IPCServerMsg): void {
    const str = `${JSON.stringify(data)}${ipcDelimiter}`;
    for (const socket of this.#sockets) socket.write(str);
  }

  _setMaster() {
    const [master, ...slaves] = this.#sockets;
    this.send(master, { t: IPCControl.master, is: true });
    for (const slave of slaves) this.send(slave, { t: IPCControl.master });
  }

  #resume(socket: Socket): void {
    if (this.#retainState) PLAYER.play();
    this.send(socket, { t: IPCControl.retain, items: this.#retain, play: this.#retainState, seek: PLAYER.lastPos });
    this.#retain = [];
  }

  #suspend(): void {
    this.#retainState = PLAYER.playing;
    PLAYER.pause();
    this.#timer = setTimeout(() => {
      if (this.#sockets.size) return;
      this.stop();
      IPC_BCST_SRV.stop();
      void Promise.allSettled([MUSIC_CACHE.store(), writeFile(RETAIN_FILE, JSON.stringify(this.#retain))]).finally(() =>
        process.exit(),
      );
    }, 40000);
  }

  #handler(data: IPCClientMsg | NeteaseAPICMsg<"album">, socket: Socket): void {
    switch (data.t) {
      case IPCApi.netease:
        if (data.msg) {
          NeteaseAPI[data.msg.i]
            .apply(undefined, data.msg.p)
            .then((msg) => this.send(socket, { t: data.t, channel: data.channel, msg }))
            .catch((err) => {
              this.send(socket, { t: data.t, channel: data.channel, err: true });
              logError(err);
            });
        }
        return;
      case IPCControl.deleteCache:
        return void API_CACHE.del(data.key);
      case IPCControl.download:
        return downloadMusic(data.url, data.path);
      case IPCControl.setting:
        STATE.minSize = data.mq === 999000 ? 2 * 1024 * 1024 : 256 * 1024;
        STATE.musicQuality = data.mq;
        STATE.cacheSize = data.cs;
        STATE.foreign = data.foreign;
        return void (API_CONFIG.protocol = data.https ? "https" : "http");
      case IPCControl.lyric:
        return LYRIC_CACHE.clear();
      case IPCControl.netease:
        return broadcastProfiles(socket);
      case IPCControl.cache:
        return MUSIC_CACHE.clear();
      case IPCControl.retain:
        if (data.items) this.#retain = <unknown[]>data.items;
        else this.send(socket, { t: IPCControl.retain, items: this.#retain });
        break;
      /* case IPCControl.pid:
        PLAYER.mediaSession(data.pid);
        break; */
      case IPCPlayer.load:
        return void PLAYER.load(data).catch(logError);
      case IPCPlayer.lyricDelay:
        return void (STATE.lyric.delay = data.delay);
      case IPCPlayer.playing:
        return void (PLAYER.playing = data.playing);
      case IPCPlayer.position:
        return posHandler(data.pos);
      case IPCPlayer.toggle:
        return PLAYER.toggle();
      case IPCPlayer.stop:
        PLAYER.stop();
        return this.broadcast(data);
      case IPCPlayer.volume:
        PLAYER.volume(data.level);
        return this.broadcast(data);
      case IPCPlayer.speed:
        PLAYER.speed(data.speed);
        return this.broadcast(data);
      case IPCPlayer.seek:
        return PLAYER.seek(data.seekOffset);
      case IPCQueue.fm:
        return this.broadcast(data);
    }
  }
}

class IPCBroadcastServer {
  readonly #sockets = new Set<Socket>();

  readonly #server: Server;

  constructor() {
    rmSync(ipcBroadcastServerPath, { recursive: true, force: true });

    this.#server = createServer((socket) => {
      this.#sockets.add(socket);

      socket
        .setEncoding("utf8")
        .on("data", (data) => this.#broadcast(data))
        .on("close", (/* err */) => {
          socket?.destroy();
          this.#sockets.delete(socket);
        })
        .on("error", logError);
    })
      .on("error", (e) => logError(e))
      .listen(ipcBroadcastServerPath);
  }

  stop(): void {
    this.#server.close(() => {
      for (const socket of this.#sockets) socket?.destroy();
      this.#sockets.clear();
    });
  }

  #broadcast(data: Buffer): void {
    for (const socket of this.#sockets) socket.write(data);
  }
}

export const IPC_SRV = new IPCServer();
export const IPC_BCST_SRV = new IPCBroadcastServer();
