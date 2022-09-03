import { APISetting, NeteaseAPI } from "./api";
import {
  IPCApi,
  IPCControl,
  IPCPlayer,
  IPCQueue,
  ipcDelimiter,
} from "@cloudmusic/shared";
import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import { LyricCache, MusicCache, apiCache } from "./cache";
import type { NeteaseAPICMsg, NeteaseAPISMsg } from "./index";
import { PersonalFm, STATE } from "./state";
import { Player, posHandler } from "./player";
import {
  RETAIN_FILE,
  TMP_DIR,
  ipcBroadcastServerPath,
  ipcServerPath,
} from "./constant";
import type { Server, Socket } from "node:net";
import { downloadMusic, logError } from "./utils";
import { readFile, rm, writeFile } from "node:fs/promises";
import { broadcastProfiles } from "./api/netease/helper";
import { createServer } from "node:net";

export class IPCServer {
  private static _first = true;

  private static _retain: unknown[] = [];

  private static _timer?: NodeJS.Timeout;

  private static readonly _sockets = new Set<Socket>();

  private static readonly _buffer = new WeakMap<Socket, string>();

  private static _server: Server;

  private static get _master(): Socket | undefined {
    const [socket] = this._sockets;
    return socket;
  }

  static async init() {
    const [buf] = await Promise.allSettled([
      readFile(RETAIN_FILE),
      rm(ipcServerPath, { recursive: true, force: true }),
    ]);
    if (buf.status === "fulfilled")
      this._retain = JSON.parse(buf.value.toString()) as unknown[];

    this._server = createServer((socket) => {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = undefined;
      }
      this._sockets.add(socket);
      this._buffer.set(socket, "");

      socket
        .setEncoding("utf8")
        .on("data", (data) => {
          const buffer = (this._buffer.get(socket) ?? "") + data.toString();

          const msgs = buffer.split(ipcDelimiter);
          this._buffer.set(socket, msgs.pop() ?? "");
          for (const msg of msgs)
            this._handler(
              JSON.parse(msg) as IPCClientMsg | NeteaseAPICMsg<"album">,
              socket
            );
        })
        .on("close", (/* err */) => {
          let isMaster = false;
          {
            const [master] = this._sockets;
            isMaster = master === socket;
          }
          socket?.destroy();
          this._sockets.delete(socket);
          this._buffer.delete(socket);

          if (this._sockets.size) {
            this._setMaster();
            if (isMaster) {
              // Master was gone, the wasm player was destroyed
              // So we need to recreate it on new master
              Player.wasmOpen();
            }
          } else {
            Player.pause();
            this._timer = setTimeout(() => {
              if (this._sockets.size) return;
              this.stop();
              IPCBroadcastServer.stop();
              Promise.allSettled([
                MusicCache.store(),
                rm(TMP_DIR, { recursive: true }),
                writeFile(RETAIN_FILE, JSON.stringify(this._retain)),
              ]).finally(() => process.exit());
            }, 20000);
          }
        })
        .on("error", logError);

      this._setMaster();

      if (this._sockets.size === 1) {
        // retain
        if (!this._first) {
          Player.play();

          this.send(socket, { t: IPCControl.retain, items: this._retain });
          this._retain = [];
        } else this._first = false;
      } else {
        this.sendToMaster({ t: IPCControl.new });
        this.send(socket, {
          t: Player.playing ? IPCPlayer.play : IPCPlayer.pause,
        });
      }
    })
      .on("error", logError)
      .listen(ipcServerPath);
  }

  static stop() {
    this._server.close(() => {
      for (const socket of this._sockets) socket?.destroy();
      this._sockets.clear();
    });
  }

  static send(socket: Socket, data: IPCServerMsg | NeteaseAPISMsg<"album">) {
    socket.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  static sendToMaster(data: IPCServerMsg): void {
    this._master?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  static broadcast(data: IPCServerMsg): void {
    const str = `${JSON.stringify(data)}${ipcDelimiter}`;
    for (const socket of this._sockets) socket.write(str);
  }

  private static _setMaster() {
    const [master, ...slaves] = this._sockets;
    this.send(master, { t: IPCControl.master, is: true });
    for (const slave of slaves) this.send(slave, { t: IPCControl.master });
  }

  private static _handler(
    data: IPCClientMsg | NeteaseAPICMsg<"album">,
    socket: Socket
  ): void {
    switch (data.t) {
      case IPCApi.netease:
        NeteaseAPI[data.msg.i]
          .apply(undefined, data.msg.p)
          .then((msg) =>
            this.send(socket, { t: data.t, channel: data.channel, msg })
          )
          .catch((err) => {
            this.send(socket, {
              t: data.t,
              channel: data.channel,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              msg: { err: true },
            });
            logError(err);
          });
        break;
      case IPCControl.deleteCache:
        apiCache.del(data.key);
        break;
      case IPCControl.download:
        downloadMusic(data.url, data.path);
        break;
      case IPCControl.setting:
        STATE.minSize = data.mq === 999000 ? 2 * 1024 * 1024 : 256 * 1024;
        STATE.musicQuality = data.mq;
        STATE.cacheSize = data.cs;
        STATE.foreign = data.foreign;
        APISetting.apiProtocol = data.https ? "https" : "http";
        break;
      case IPCControl.lyric:
        LyricCache.clear();
        break;
      case IPCControl.netease:
        broadcastProfiles(socket);
        break;
      case IPCControl.cache:
        MusicCache.clear();
        break;
      case IPCControl.retain:
        if (data.items) this._retain = data.items as unknown[];
        else this.send(socket, { t: IPCControl.retain, items: this._retain });
        break;
      /* case IPCControl.pid:
        Player.mediaSession(data.pid);
        break; */
      case IPCPlayer.load:
        Player.load(data).catch(logError);
        break;
      case IPCPlayer.lyricDelay:
        STATE.lyric.delay = data.delay;
        break;
      case IPCPlayer.playing:
        Player.playing = data.playing;
        break;
      case IPCPlayer.position:
        posHandler(data.pos);
        break;
      case IPCPlayer.toggle:
        Player.toggle();
        break;
      case IPCPlayer.stop:
        Player.stop();
        this.broadcast(data);
        break;
      case IPCPlayer.volume:
        Player.volume(data.level);
        this.broadcast(data);
        break;
      case IPCPlayer.speed:
        Player.speed(data.speed);
        this.broadcast(data);
        break;
      case IPCPlayer.seek:
        Player.seek(data.seekOffset);
        break;
      case IPCQueue.fm:
        if (data.is) {
          STATE.fm = true;
          PersonalFm.uid = data.uid;
          this.broadcast({ t: IPCQueue.fm });
        } else STATE.fm = false;
        break;
      case IPCQueue.fmNext:
        PersonalFm.head()
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

export class IPCBroadcastServer {
  private static readonly _sockets = new Set<Socket>();

  private static _server: Server;

  static async init(): Promise<void> {
    await rm(ipcBroadcastServerPath, { recursive: true, force: true }).catch(
      () => undefined
    );

    this._server = createServer((socket) => {
      this._sockets.add(socket);

      socket
        .setEncoding("utf8")
        .on("data", (data) => this._broadcast(data))
        .on("close", (/* err */) => {
          socket?.destroy();
          this._sockets.delete(socket);
        })
        .on("error", logError);
    })
      .on("error", logError)
      .listen(ipcBroadcastServerPath);
  }

  static stop(): void {
    this._server.close(() => {
      for (const socket of this._sockets) socket?.destroy();
      this._sockets.clear();
    });
  }

  private static _broadcast(data: Buffer): void {
    for (const socket of this._sockets) socket.write(data);
  }
}
