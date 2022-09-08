import { API_CACHE, LYRIC_CACHE, MUSIC_CACHE } from "./cache";
import { API_CONFIG, NeteaseAPI } from "./api";
import { IPCApi, IPCControl, IPCPlayer, IPCQueue, ipcDelimiter } from "@cloudmusic/shared";
import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import type { NeteaseAPICMsg, NeteaseAPISMsg } from "./index";
import { PERSONAL_FM, STATE } from "./state";
import { PLAYER, posHandler } from "./player";
import { RETAIN_FILE, ipcBroadcastServerPath, ipcServerPath } from "./constant";
import type { Server, Socket } from "node:net";
import { downloadMusic, logError } from "./utils";
import { readFile, writeFile } from "node:fs/promises";
import { broadcastProfiles } from "./api/netease/helper";
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
      .on("error", logError)
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
      Promise.allSettled([MUSIC_CACHE.store(), writeFile(RETAIN_FILE, JSON.stringify(this.#retain))]).finally(() =>
        process.exit()
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
        break;
      case IPCControl.deleteCache:
        API_CACHE.del(data.key);
        break;
      case IPCControl.download:
        downloadMusic(data.url, data.path);
        break;
      case IPCControl.setting:
        STATE.minSize = data.mq === 999000 ? 2 * 1024 * 1024 : 256 * 1024;
        STATE.musicQuality = data.mq;
        STATE.cacheSize = data.cs;
        STATE.foreign = data.foreign;
        API_CONFIG.protocol = data.https ? "https" : "http";
        break;
      case IPCControl.lyric:
        LYRIC_CACHE.clear();
        break;
      case IPCControl.netease:
        broadcastProfiles(socket);
        break;
      case IPCControl.cache:
        MUSIC_CACHE.clear();
        break;
      case IPCControl.retain:
        if (data.items) this.#retain = <unknown[]>data.items;
        else this.send(socket, { t: IPCControl.retain, items: this.#retain });
        break;
      /* case IPCControl.pid:
        PLAYER.mediaSession(data.pid);
        break; */
      case IPCPlayer.load:
        PLAYER.load(data).catch(logError);
        break;
      case IPCPlayer.lyricDelay:
        STATE.lyric.delay = data.delay;
        break;
      case IPCPlayer.playing:
        PLAYER.playing = data.playing;
        break;
      case IPCPlayer.position:
        posHandler(data.pos);
        break;
      case IPCPlayer.toggle:
        PLAYER.toggle();
        break;
      case IPCPlayer.stop:
        PLAYER.stop();
        this.broadcast(data);
        break;
      case IPCPlayer.volume:
        PLAYER.volume(data.level);
        this.broadcast(data);
        break;
      case IPCPlayer.speed:
        PLAYER.speed(data.speed);
        this.broadcast(data);
        break;
      case IPCPlayer.seek:
        PLAYER.seek(data.seekOffset);
        break;
      case IPCQueue.fm:
        if (data.is) {
          STATE.fm = true;
          PERSONAL_FM.uid = data.uid;
          this.broadcast({ t: IPCQueue.fm });
        } else STATE.fm = false;
        break;
      case IPCQueue.fmNext:
        PERSONAL_FM.head()
          .then((item) => {
            if (item) {
              STATE.fm = true;
              this.broadcast({ t: IPCQueue.fmNext, item });
            }
          })
          .catch(logError);
        break;
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
      .on("error", logError)
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
