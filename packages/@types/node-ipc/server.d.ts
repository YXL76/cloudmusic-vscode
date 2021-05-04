/// <reference types="node" />

import type { ClientMsg } from ".";
import type { IPCEvent } from "@cloudmusic/shared";
import type { Socket } from "net";

export interface SocketConfig {
  address?: string;
  port?: number;
}

export type BroadcastMsg =
  | { t: IPCEvent.Play.load }
  | { t: IPCEvent.Play.pause }
  | { t: IPCEvent.Play.play }
  | { t: IPCEvent.Play.volume; level: number }
  | { t: IPCEvent.Queue.add; items: unknown; index?: number }
  | { t: IPCEvent.Queue.clear }
  | { t: IPCEvent.Queue.delete; id: string | number }
  | { t: IPCEvent.Queue.new; items: unknown; id?: number }
  | { t: IPCEvent.Queue.play; id: string | number }
  | { t: IPCEvent.Queue.random; items: unknown }
  | { t: IPCEvent.Queue.shift; index: number }
  | { t: IPCEvent.Queue.sort; type: number; order: number };

export interface Server {
  sockets: ReadonlyArray<Socket>;

  on(event: "error", callback: (err: unknown) => void): Server;
  on(event: "connect" | "disconnect" | "destroy", callback: () => void): Server;
  on(
    event: "socket.disconnected",
    callback: (socket: Socket, destroyedSocketID: string) => void
  ): Server;

  on(event: "msg", callback: (data: ClientMsg, socket: Socket) => void): Server;

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

  broadcast(event: "msg", value: BroadcastMsg): Server;
}
