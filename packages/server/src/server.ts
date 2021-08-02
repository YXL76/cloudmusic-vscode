import { APISetting, NeteaseAPI } from "./api";
import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import { LyricCache, MusicCache, apiCache } from "./cache";
import type { NeteaseAPICMsg, NeteaseAPISMsg } from ".";
import { PersonalFm, State } from "./state";
import { Player, posHandler } from "./player";
import {
  RETAIN_FILE,
  TMP_DIR,
  ipcBroadcastServerPath,
  ipcServerPath,
} from "./constant";
import type { Server, Socket } from "net";
import { downloadMusic, logError } from "./utils";
import { readFileSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { basename } from "path";
import { broadcastProfiles } from "./api/netease/helper";
import { createServer } from "net";
import { ipcDelimiter } from "@cloudmusic/shared";

export class IPCServer {
  private static _first = true;

  private static _retain: unknown[] = [];

  private static _timer?: NodeJS.Timeout;

  private static readonly _sockets = new Set<Socket>();

  private static readonly _buffer = new Map<Socket, string>();

  private static _server: Server;

  static init(): void {
    try {
      unlinkSync(ipcServerPath);
    } catch {}

    try {
      this._retain = JSON.parse(
        readFileSync(RETAIN_FILE).toString()
      ) as unknown[];
    } catch {}

    /* readFile(RETAIN_FILE)
      .then((data) => (this._retain = JSON.parse(data.toString()) as unknown[]))
      .catch(logError); */

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
          for (const msg of msgs) this._handler(JSON.parse(msg), socket);
        })
        .on("close", (/* err */) => {
          socket?.destroy();
          this._sockets.delete(socket);
          this._buffer.delete(socket);

          if (this._sockets.size) {
            this._setMaster();
            Player.wasmOpen();
          } else {
            Player.pause();
            this._timer = setTimeout(() => {
              if (this._sockets.size) return;
              this.stop();
              IPCBroadcastServer.stop();
              MusicCache.store();
              try {
                rmdirSync(TMP_DIR, { recursive: true });
              } catch {}
              try {
                writeFileSync(RETAIN_FILE, JSON.stringify(this._retain));
              } catch {}
              process.exit();
            }, 20000);
          }
        })
        .on("error", logError);

      this._setMaster();

      if (this._sockets.size === 1) {
        if (!this._first) {
          Player.play();

          this.send(socket, { t: "control.retain", items: this._retain });
          this._retain = [];

          Player.wasmOpen();
        } else this._first = false;
      } else {
        this.sendToMaster({ t: "control.new" });
        const tmp = State.playing;
        State.playing = tmp;
      }
    })
      .on("error", logError)
      .listen(ipcServerPath);
  }

  static stop(): void {
    this._server.close(() => {
      for (const socket of this._sockets) socket?.destroy();
      this._sockets.clear();
    });
  }

  static send(
    socket: Socket,
    data: IPCServerMsg | NeteaseAPISMsg<"album">
  ): void {
    socket.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  static sendToMaster(data: IPCServerMsg): void {
    this._master?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  static broadcast(data: IPCServerMsg): void {
    const str = `${JSON.stringify(data)}${ipcDelimiter}`;
    for (const socket of this._sockets) socket.write(str);
  }

  private static get _master(): Socket | undefined {
    const [socket] = this._sockets;
    return socket;
  }

  private static _setMaster() {
    const [master, ...slaves] = this._sockets;
    this.send(master, { t: "control.master", is: true });
    for (const slave of slaves) this.send(slave, { t: "control.master" });
  }

  private static _handler(
    data: IPCClientMsg | NeteaseAPICMsg<"album">,
    socket: Socket
  ): void {
    switch (data.t) {
      case "api.netease":
        NeteaseAPI[data.msg.i]
          .apply(undefined, data.msg.p)
          .then((msg) =>
            this.send(socket, { t: data.t, channel: data.channel, msg })
          )
          .catch(logError);
        break;
      case "control.deleteCache":
        apiCache.del(data.key);
        break;
      case "control.download":
        void downloadMusic(data.url, basename(data.path), data.path, false);
        break;
      case "control.init":
        State.minSize = data.mq === 999000 ? 2 * 1024 * 1024 : 256 * 1024;
        State.musicQuality = data.mq;
        State.cacheSize = data.cs;
        State.foreign = data.foreign;
        APISetting.apiProtocol = data.https ? "https" : "http";
        if (data.player)
          Player.init(data.player.wasm, data.player.name, data.volume);
        break;
      case "control.lyric":
        LyricCache.clear();
        break;
      case "control.netease":
        broadcastProfiles(socket);
        break;
      case "control.music":
        MusicCache.clear();
        break;
      case "control.retain":
        if (data.items) this._retain = data.items as unknown[];
        else this.send(socket, { t: "control.retain", items: this._retain });
        break;
      case "player.load":
        void Player.load(data);
        break;
      case "player.lyricDelay":
        State.lyric.delay = data.delay;
        break;
      case "player.playing":
        State.playing = data.playing;
        break;
      case "player.position":
        posHandler(data.pos);
        break;
      case "player.toggle":
        State.playing ? Player.pause() : Player.play();
        break;
      case "player.stop":
        Player.stop();
        this.broadcast(data);
        break;
      case "player.volume":
        Player.volume(data.level);
        this.broadcast(data);
        break;
      case "queue.fm":
        State.fm = data.is;
        PersonalFm.uid = data.uid;
        this.broadcast(data);
        break;
      case "queue.fmNext":
        PersonalFm.head()
          .then((item) => this.broadcast({ t: "queue.fmNext", item }))
          .catch(logError);
        break;
    }
  }
}

export class IPCBroadcastServer {
  private static readonly _sockets = new Set<Socket>();

  private static _server: Server;

  static init(): void {
    try {
      unlinkSync(ipcBroadcastServerPath);
    } catch {}

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
