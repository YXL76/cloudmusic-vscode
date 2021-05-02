import { IPCEvent, ipcDefaultConfig, ipcServerId } from "@cloudmusic/shared";
import { IPC } from "node-ipc";
import { QueueProvider } from "../treeview";
import { State } from ".";

const ipc = new IPC();
Object.assign(ipc.config, ipcDefaultConfig, { id: `${process.pid}` });

const callback = () => {
  /* ipc.of[ipcServerId].on("connect", () => {
    console.log("connect");
  });
  ipc.of[ipcServerId].on("destroy", () => {
    console.log("destroyed");
  });
  ipc.of[ipcServerId].on("disconnect", () => {
    console.log("disconnected");
  }); */

  ipc.of[ipcServerId].on("msg", (data) => {
    switch (data.t) {
      case IPCEvent.Play.pause:
        State.playing = false;
        break;
      case IPCEvent.Play.play:
        State.playing = true;
        break;
      case IPCEvent.Play.stop:
        State.playing = false;
        break;
      case IPCEvent.Queue.clear:
        QueueProvider.refresh(() => QueueProvider.clear());
        break;
    }
  });
};

ipc.connectTo(ipcServerId, callback);

export class IPCClient {
  private static readonly ipc = ipc;

  static load(url: string): void {
    this.emit({ t: IPCEvent.Play.load, url });
  }

  static pause(): void {
    this.emit({ t: IPCEvent.Play.pause });
  }

  static play(): void {
    this.emit({ t: IPCEvent.Play.play });
  }

  static stop(): void {
    this.emit({ t: IPCEvent.Play.stop });
  }

  static volume(level: number): void {
    this.emit({ t: IPCEvent.Play.volume, level });
  }

  static clear(): void {
    this.emit({ t: IPCEvent.Queue.clear });
  }

  private static emit(value: Parameters<typeof ipc.of.x.emit>[1]): void {
    this.ipc.of[ipcServerId].emit("msg", value);
  }
}
