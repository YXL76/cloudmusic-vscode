/// <reference types="node" />

import type { BroadcastMsg } from ".";
import type { IPCEvent } from "@cloudmusic/shared";
import type { Socket } from "net";

export type ClientMsg =
  | { t: IPCEvent.Play.load; url: string; pid?: number }
  | { t: IPCEvent.Play.stop }
  | { t: IPCEvent.Play.toggle }
  | { t: IPCEvent.Play.volume; level: number }
  | { t: IPCEvent.Queue.add; items: unknown; index?: number }
  | { t: IPCEvent.Queue.clear }
  | { t: IPCEvent.Queue.delete; id: string | number }
  | { t: IPCEvent.Queue.new; items: unknown; id?: number }
  | { t: IPCEvent.Queue.play; id: string | number }
  | { t: IPCEvent.Queue.shift; index: number }
  | { t: IPCEvent.Queue.sort; type: number; order: number };

export interface Client {
  /**
   * triggered when a JSON message is received. The event name will be the type string from your message
   * and the param will be the data object from your message eg : { type:'myEvent',data:{a:1}}
   */

  /**
   * triggered when an error has occured
   */
  on(event: "error", callback: (err: unknown) => void): Client;

  /**
   * connect - triggered when socket connected
   * disconnect - triggered by client when socket has disconnected from server
   * destroy - triggered when socket has been totally destroyed, no further auto retries will happen and all references are gone
   */
  on(event: "connect" | "disconnect" | "destroy", callback: () => void): Client;

  /**
   * triggered by server when a client socket has disconnected
   */
  on(
    event: "socket.disconnected",
    callback: (socket: Socket, destroyedSocketID: string) => void
  ): Client;

  /**
   * triggered when ipc.config.rawBuffer is true and a message is received
   */
  on(event: "data", callback: (buffer: Buffer) => void): Client;

  on(
    event: "msg",
    callback: (data: BroadcastMsg, socket: Socket) => void
  ): Client;

  emit(event: "msg", value: ClientMsg): Client;

  /**
   * Unbind subscribed events
   */
  off(event: string, handler: unknown): Client;
}
