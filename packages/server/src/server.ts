import type {
  IPCClientMsg,
  IPCServerMsg,
  NeteaseAPICMsg,
  NeteaseAPISMsg,
} from "@cloudmusic/shared";
import {
  LyricCache,
  MusicCache,
  NeteaseAPI,
  PersonalFm,
  Player,
  State,
  apiCache,
  downloadMusic,
  getMusicPath,
  logError,
} from ".";
import type { Server, Socket } from "net";
import {
  TMP_DIR,
  ipcBroadcastServerPath,
  ipcDelimiter,
  ipcServerPath,
} from "@cloudmusic/shared";
import { rmdirSync, unlinkSync } from "fs";
import { basename } from "path";
import { createServer } from "net";

export class IPCServer {
  private static _retain: unknown[] = [];

  private static _timer?: NodeJS.Timeout;

  private static readonly _sockets = new Set<Socket>();

  private static readonly _buffer = new Map<Socket, string>();

  private static _server: Server;

  static init(): void {
    try {
      unlinkSync(ipcServerPath);
    } catch {}

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
          for (const msg of msgs) void this._handler(JSON.parse(msg), socket);
        })
        .on("close", (/* err */) => {
          socket?.destroy();
          this._sockets.delete(socket);
          this._buffer.set(socket, "");

          if (this._sockets.size) this._setMaster();
          else {
            Player.pause();
            this._timer = setTimeout(() => {
              if (this._sockets.size) return;
              this.stop();
              IPCBroadcastServer.stop();
              MusicCache.store();
              try {
                rmdirSync(TMP_DIR, { recursive: true });
              } catch {}
              process.exit();
            }, 20000);
          }
        })
        .on("error", logError);

      this._setMaster();

      if (this._sockets.size === 1) {
        Player.play();

        this.send(socket, {
          t: "control.retain",
          items: IPCServer._retain,
        });
        this._retain = [];
      } else {
        this.sendToMaster({ t: "control.new" });
        const tmp = State.playing;
        State.playing = tmp;
        setTimeout(() => this.send(socket, { t: "player.load" }), 1024);
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

  private static async _handler(
    data: IPCClientMsg | NeteaseAPICMsg<"album">,
    socket: Socket
  ): Promise<void> {
    switch (data.t) {
      case "api.netease":
        this.send(socket, {
          t: data.t,
          channel: data.channel,
          msg: await NeteaseAPI[data.msg.i].apply(undefined, data.msg.p),
        });
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
        if (data.volume) Player.volume(data.volume);
        break;
      case "control.lyric":
        LyricCache.clear();
        break;
      case "control.music":
        MusicCache.clear();
        break;
      case "control.retain":
        this._retain = data.items as unknown[];
        break;
      case "player.load":
        {
          const path = await getMusicPath(data);
          if (
            path &&
            Player.load(path, data?.dt, data?.id, data?.pid, data?.next)
          )
            this.broadcast({ t: "player.load" });
          else this.sendToMaster({ t: "player.end", fail: true });
        }
        break;
      case "player.lyricDelay":
        State.lyric.delay = data.delay;
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
        this.broadcast(data);
        break;
      case "queue.fmNext":
        this.broadcast({ t: "queue.fmNext", item: await PersonalFm.head() });
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
