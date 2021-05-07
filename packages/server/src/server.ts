import type { IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import {
  IPCEvent,
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
import { Player, State } from ".";
import type { Socket } from "net";
import { createServer } from "net";
import { platform } from "os";
import { unlinkSync } from "fs";

export class IPCServer {
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
        IPCServer._sockets.add(socket);
        socket.setEncoding("utf8");

        socket
          .on("close", (/* err */) => {
            for (const socket of IPCServer._sockets) {
              if (socket?.readable) continue;
              socket?.destroy();
              IPCServer._sockets.delete(socket);
              return;
            }
          })
          // .on("error", (err) => {})
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
              IPCServer._handler(JSON.parse(msg) /*,socket*/);
          });
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

  static broadcast(data: IPCServerMsg): void {
    for (const socket of this._sockets)
      socket.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  private static _handler(data: IPCClientMsg /* , socket: Socket */): void {
    switch (data.t) {
      case IPCEvent.Play.load:
        if (Player.load(data.url)) this.broadcast({ t: IPCEvent.Play.load });
        break;
      case IPCEvent.Play.toggle:
        State.playing ? Player.pause() : Player.play();
        break;
      case IPCEvent.Play.stop:
        Player.stop();
        break;
      case IPCEvent.Play.volume:
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
          .on("close", (/* err */) => {
            for (const socket of IPCBroadcastServer._sockets) {
              if (socket?.readable) continue;
              socket?.destroy();
              IPCBroadcastServer._sockets.delete(socket);
              return;
            }
          })
          // .on("error", (err) => {})
          .on("data", (data) => IPCBroadcastServer.broadcast(data));
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
