/// <reference types="node" />

import type { IPCEvent } from "@cloudmusic/shared";
import type { Socket } from "net";

export interface SocketConfig {
  address?: string;
  port?: number;
}

export interface Server {
  sockets: ReadonlyArray<Socket>;

  on(event: "error", callback: (err: unknown) => void): Server;
  on(event: "connect" | "disconnect" | "destroy", callback: () => void): Server;
  on(
    event: "socket.disconnected",
    callback: (socket: Socket, destroyedSocketID: string) => void
  ): Server;

  on(
    event: "msg",
    callback: (
      data:
        | { t: IPCEvent.Play.load; url: string }
        | { t: IPCEvent.Play.pause }
        | { t: IPCEvent.Play.play }
        | { t: IPCEvent.Play.stop }
        | { t: IPCEvent.Play.volume; level: number }
        | { t: IPCEvent.Queue.clear },
      socket: Socket
    ) => void
  ): Server;

  /**
   * start serving need top call serve or serveNet first to set up the server
   */
  start(): void;

  /**
   * close the server and stop serving
   */
  stop(): void;

  // emit(value: unknown): Server;
  // emit(event: string, value: unknown): Server;
  emit(socket: Socket | SocketConfig, event: string, value?: unknown): Server;
  emit(socketConfig: Socket | SocketConfig, value?: unknown): Server;

  broadcast(
    event: "msg",
    value:
      | { t: IPCEvent.Play.pause }
      | { t: IPCEvent.Play.play }
      | { t: IPCEvent.Play.stop }
      | { t: IPCEvent.Queue.clear }
  ): Server;
}
