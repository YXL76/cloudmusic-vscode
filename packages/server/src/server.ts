import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  SETTING_DIR,
  TMP_DIR,
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
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
} from ".";
import { rmdirSync, unlinkSync } from "fs";
import type { Socket } from "net";
import { basename } from "path";
import { createServer } from "net";
import { mkdir } from "fs/promises";
import { platform } from "os";

export class IPCServer {
  private static _retain = "[]";

  private static _timer?: NodeJS.Timeout;

  private static readonly _sockets = new Set<Socket>();

  private static readonly _buffer = new Map<Socket, string>();

  private static readonly _server = (() => {
    const path =
      platform() === "win32"
        ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcServerId}`
            .replace(/^\//, "")
            .replace(/\//g, "-")}`
        : `/tmp/${ipcAppspace}${ipcServerId}`;
    try {
      unlinkSync(path);
    } catch {}

    return createServer((socket) => {
      if (IPCServer._timer) {
        clearTimeout(IPCServer._timer);
        IPCServer._timer = undefined;
      }

      socket
        .setEncoding("utf8")
        .on("data", (data) => {
          const buffer =
            (IPCServer._buffer.get(socket) ?? "") + data.toString();

          const msgs = buffer.split(ipcDelimiter);
          IPCServer._buffer.set(socket, msgs.pop() ?? "");
          for (const msg of msgs)
            void IPCServer._handler(JSON.parse(msg), socket);
        })
        .on("close", (err) => {
          console.error(err);

          socket?.destroy();
          IPCServer._sockets.delete(socket);
          IPCServer._buffer.set(socket, "");

          if (IPCServer._sockets.size) IPCServer._setMaster();
          else {
            Player.pause();
            IPCServer._timer = setTimeout(() => {
              if (IPCServer._sockets.size) return;
              IPCServer.stop();
              IPCBroadcastServer.stop();
              MusicCache.store();
              try {
                rmdirSync(TMP_DIR, { recursive: true });
              } catch {}
              process.exit();
            }, 20000);
          }
        })
        .on("error", console.error);

      IPCServer._sockets.add(socket);
      IPCServer._buffer.set(socket, "");
      IPCServer._setMaster();

      if (IPCServer._sockets.size === 1) {
        Player.play();

        if (IPCServer._retain !== "[]") {
          IPCServer.send(socket, {
            t: "control.retain",
            items: IPCServer._retain,
          });
          IPCServer._retain = "[]";
        }
      } else {
        IPCServer.sendToMaster({ t: "control.new" });
        const tmp = State.playing;
        State.playing = tmp;
        setTimeout(() => IPCServer.send(socket, { t: "player.load" }), 1024);
      }
    })
      .on("error", console.error)
      .listen(path);
  })();

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
        Player.volume(data.volume);
        break;
      case "control.lyric":
        LyricCache.clear();
        break;
      case "control.music":
        MusicCache.clear();
        break;
      case "control.retain":
        this._retain = data.items;
        break;
      case "player.load":
        {
          const path = await getMusicPath(data);
          if (
            path &&
            Player.load(path, data?.dt, data?.id, data?.pid, data?.next)
          )
            this.broadcast({ t: "player.load" });
          else IPCServer.sendToMaster({ t: "player.end", fail: true });
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

  private static readonly _server = (() => {
    const path =
      platform() === "win32"
        ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcBroadcastServerId}`
            .replace(/^\//, "")
            .replace(/\//g, "-")}`
        : `/tmp/${ipcAppspace}${ipcBroadcastServerId}`;
    try {
      unlinkSync(path);
    } catch {}

    return createServer((socket) => {
      IPCBroadcastServer._sockets.add(socket);

      socket
        .setEncoding("utf8")
        .on("data", (data) => IPCBroadcastServer._broadcast(data))
        .on("close", (err) => {
          console.error(err);

          socket?.destroy();
          IPCBroadcastServer._sockets.delete(socket);
        })
        .on("error", console.error);
    })
      .on("error", console.error)
      .listen(path);
  })();

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

const tryMkdir = async (path: string) => {
  try {
    await mkdir(path);
  } catch {}
};

void (async () => {
  await tryMkdir(SETTING_DIR);
  await tryMkdir(TMP_DIR);
  await tryMkdir(CACHE_DIR);
  await tryMkdir(LYRIC_CACHE_DIR);
  await tryMkdir(MUSIC_CACHE_DIR);
  void MusicCache.init();
})();
