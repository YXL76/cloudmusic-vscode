import { IPC, State, ipc, ipcB } from "../util";
import type { IPCBroadcastMsg, IPCServerMsg } from "@cloudmusic/shared";
import { ButtonManager } from "../manager";
import type { PlayTreeItemData } from "../treeview";
import { QueueProvider } from "../treeview";
import { commands } from "vscode";
import { fork } from "child_process";
import { resolve } from "path";

const ipcHandler = (data: IPCServerMsg) => {
  switch (data.t) {
    case "control.master":
      State.master = data.is ?? false;
      break;
    case "player.end":
      if (State.repeat) void IPC.load();
      else void commands.executeCommand("cloudmusic.next");
      break;
    case "player.load":
      State.loading = false;
      break;
    case "player.pause":
      ButtonManager.buttonPlay(false);
      break;
    case "player.play":
      ButtonManager.buttonPlay(true);
      break;
    case "player.volume":
      ButtonManager.buttonVolume(data.level);
      break;
  }
};

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case "player.repeat":
      ButtonManager.buttonRepeat(data.r);
      break;
    case "queue.add":
      QueueProvider.addRaw(data.items as PlayTreeItemData[], data.index);
      break;
    case "queue.clear":
      QueueProvider.clear();
      break;
    case "queue.delete":
      QueueProvider.delete(data.id);
      break;
    case "queue.new":
      QueueProvider.newRaw(data.items as PlayTreeItemData[], data.id);
      break;
    case "queue.play":
      QueueProvider.top(data.id);
      break;
    case "queue.shift":
      QueueProvider.shift(data.index);
      break;
    case "queue.sort":
      QueueProvider.sort(data.type, data.order);
      break;
  }
};

export function initIPC(): void {
  Promise.all([ipc.connect(ipcHandler, 0), ipcB.connect(ipcBHandler, 0)])
    .then((firstTry) => {
      if (firstTry.includes(false)) throw Error;
    })
    .catch(() =>
      Promise.resolve(
        fork(resolve(__dirname, "server.js"), { detached: true, silent: true })
      )
    )
    .then(() =>
      Promise.all([ipc.connect(ipcHandler), ipcB.connect(ipcBHandler)])
    )
    .catch(console.error);
}
