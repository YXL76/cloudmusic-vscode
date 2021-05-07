import { State, ipc, ipcB } from "../util";
import { ButtonManager } from "../manager";
import { IPCEvent } from "@cloudmusic/shared";
import type { PlayTreeItemData } from "../treeview";
import { QueueProvider } from "../treeview";

export async function initIPC(): Promise<void> {
  await Promise.allSettled([
    ipc.connect((data) => {
      switch (data.t) {
        case IPCEvent.Play.load:
          State.loading = false;
          break;
        case IPCEvent.Play.pause:
          ButtonManager.buttonPlay(false);
          break;
        case IPCEvent.Play.play:
          ButtonManager.buttonPlay(true);
          break;
        case IPCEvent.Play.volume:
          ButtonManager.buttonVolume(data.level);
          break;
      }
    }),
    ipcB.connect((data) => {
      switch (data.t) {
        case IPCEvent.Queue.add:
          QueueProvider.addRaw(data.items as PlayTreeItemData[], data.index);
          break;
        case IPCEvent.Queue.clear:
          QueueProvider.clear();
          break;
        case IPCEvent.Queue.delete:
          QueueProvider.delete(data.id);
          break;
        case IPCEvent.Queue.new:
          QueueProvider.newRaw(data.items as PlayTreeItemData[], data.id);
          break;
        case IPCEvent.Queue.play:
          QueueProvider.top(data.id);
          break;
        case IPCEvent.Queue.shift:
          QueueProvider.shift(data.index);
          break;
        case IPCEvent.Queue.sort:
          QueueProvider.sort(data.type, data.order);
          break;
      }
    }),
  ]);
}
