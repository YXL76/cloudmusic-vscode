import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import { Player, State } from ".";
import { homedir, platform } from "os";
import {
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
import { rmdirSync, unlinkSync } from "fs";
import type { Socket } from "net";
import { createServer } from "net";
import { resolve } from "path";

export const HOME_DIR = homedir();
export const SETTING_DIR = resolve(HOME_DIR, ".cloudmusic");
export const TMP_DIR = resolve(SETTING_DIR, "tmp");

export class IPCServer {
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

    return (
      createServer((socket) => {
        if (IPCServer._timer) {
          clearTimeout(IPCServer._timer);
          IPCServer._timer = undefined;
        }

        IPCServer._sockets.add(socket);
        socket.setEncoding("utf8");

        socket
          .on("data", (data) => {
            const buffer =
              (IPCServer._buffer.get(socket) ?? "") + data.toString();

            if (buffer.lastIndexOf(ipcDelimiter) === -1) {
              IPCServer._buffer.set(socket, buffer);
              return;
            }

            IPCServer._buffer.set(socket, "");
            const msgs = buffer.split(ipcDelimiter);
            msgs.pop();
            for (const msg of msgs)
              IPCServer._handler(JSON.parse(msg) /* socket */);
          })
          .on("close", (/* err */) => {
            for (const socket of IPCServer._sockets) {
              if (socket?.readable) continue;
              socket?.destroy();
              IPCServer._sockets.delete(socket);
              break;
            }

            if (IPCServer._sockets.size) IPCServer.setMaster();
            else {
              Player.pause();
              IPCServer._timer = setTimeout(() => {
                if (IPCServer._sockets.size) return;
                IPCServer.stop();
                IPCBroadcastServer.stop();
                try {
                  rmdirSync(TMP_DIR, { recursive: true });
                } catch {}
                process.exit();
              }, 20000);
            }
          });
        // .on("error", (err) => {})
        if (IPCServer._sockets.size === 1) {
          IPCServer.setMaster();
          Player.play();
        }
      })
        // .on("error", (err) => {})
        .listen(path)
    );
  })();

  static stop(): void {
    this._server.close(() => {
      for (const socket of this._sockets) socket?.destroy();
      this._sockets.clear();
    });
  }

  static send(socket: Socket, data: IPCServerMsg): void {
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

  private static setMaster() {
    const [master, ...slaves] = this._sockets;
    this.send(master, { t: "control.master", is: true });
    for (const slave of slaves) this.send(slave, { t: "control.master" });
  }

  private static _handler(data: IPCClientMsg /* , socket: Socket */): void {
    switch (data.t) {
      case "player.load":
        if (Player.load(data.url)) this.broadcast({ t: "player.load" });
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

    return (
      createServer((socket) => {
        IPCBroadcastServer._sockets.add(socket);
        socket.setEncoding("utf8");

        socket
          .on("data", (data) => IPCBroadcastServer.broadcast(data))
          .on("close", (/* err */) => {
            for (const socket of IPCBroadcastServer._sockets) {
              if (socket?.readable) continue;
              socket?.destroy();
              IPCBroadcastServer._sockets.delete(socket);
              return;
            }
          });
        // .on("error", (err) => {})
      })
        // .on("error", (err) => {})
        .listen(path)
    );
  })();

  static stop(): void {
    this._server.close(() => {
      for (const socket of this._sockets) socket?.destroy();
      this._sockets.clear();
    });
  }

  static broadcast(data: Buffer): void {
    for (const socket of this._sockets) socket.write(data);
  }
}
