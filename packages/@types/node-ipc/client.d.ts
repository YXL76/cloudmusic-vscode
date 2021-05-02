/// <reference types="node" />

import type { IPCEvent } from "@cloudmusic/shared";
import type { Socket } from "net";

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
    callback: (
      data:
        | { t: IPCEvent.Play.pause }
        | { t: IPCEvent.Play.play }
        | { t: IPCEvent.Play.stop }
        | { t: IPCEvent.Queue.clear },
      socket: Socket
    ) => void
  ): Client;

  emit(
    event: "msg",
    value:
      | { t: IPCEvent.Play.load; url: string }
      | { t: IPCEvent.Play.pause }
      | { t: IPCEvent.Play.play }
      | { t: IPCEvent.Play.stop }
      | { t: IPCEvent.Play.volume; level: number }
      | { t: IPCEvent.Queue.clear }
  ): Client;

  /**
   * Unbind subscribed events
   */
  off(event: string, handler: unknown): Client;
}
