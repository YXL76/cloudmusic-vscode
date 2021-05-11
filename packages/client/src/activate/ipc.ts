import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC, State, ipc, ipcB, setLyric } from "../util";
import { COOKIE_KEY, ICON, VOLUME_KEY } from "../constant";
import type {
  IPCBroadcastMsg,
  IPCServerMsg,
  NeteaseAPIKey,
  NeteaseAPISMsg,
} from "@cloudmusic/shared";
import type { ExtensionContext } from "vscode";
import type { PlayTreeItemData } from "../treeview";
import { QueueProvider } from "../treeview";
import { commands } from "vscode";
import { fork } from "child_process";
import { resolve } from "path";

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case "control.login":
      AccountManager.uid = data.userId;
      AccountManager.nickname = data.nickname;
      AccountManager.likelist.clear();
      void IPC.netease("likelist", []).then((ids) => {
        for (const id of ids) AccountManager.likelist.add(id);
      });
      State.login = true;
      break;
    case "control.logout":
      AccountManager.uid = 0;
      AccountManager.nickname = "";
      AccountManager.likelist.clear();
      State.login = false;
      break;
    case "player.load":
      State.loading = true;
      break;
    case "player.repeat":
      State.repeat = data.r;
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

export async function initIPC(context: ExtensionContext): Promise<void> {
  const ipcHandler = (data: IPCServerMsg | NeteaseAPISMsg<NeteaseAPIKey>) => {
    switch (data.t) {
      case "api.netease":
        {
          const req = IPC.requestPool.get(data.channel);
          IPC.requestPool.delete(data.channel);
          if (req) req.resolve(data.msg);
        }
        break;
      case "control.cookie":
        void context.secrets.store(COOKIE_KEY, data.cookie);
        break;
      case "control.init":
        ButtonManager.buttonPlay(data.playing);
        break;
      case "control.master":
        State.master = !!data.is;
        break;
      case "control.new":
        IPC.new(QueueProvider.toJSON());
        break;
      case "control.retain":
        QueueProvider.newRaw(data.items as PlayTreeItemData[]);
        break;
      case "player.end":
        if (!data.fail && State.repeat) IPC.load();
        else void commands.executeCommand("cloudmusic.next");
        break;
      case "player.load":
        State.loading = false;
        break;
      case "player.pause":
        ButtonManager.buttonPlay(false);
        AccountViewProvider.pause();
        break;
      case "player.play":
        ButtonManager.buttonPlay(true);
        AccountViewProvider.play();
        break;
      case "player.stop":
        ButtonManager.buttonSong();
        ButtonManager.buttonLyric();
        setLyric(0, [0], { text: [ICON.lyric] }, { text: [ICON.lyric] });
        AccountViewProvider.stop();
        break;
      case "player.volume":
        ButtonManager.buttonVolume(data.level);
        break;
    }
  };

  try {
    const firstTry = await Promise.all([
      ipc.connect(ipcHandler, 0),
      ipcB.connect(ipcBHandler, 0),
    ]);
    if (firstTry.includes(false)) throw Error;
    State.first = false;
  } catch {
    fork(resolve(__dirname, "server.js"), {
      detached: true,
      stdio: "ignore",
    }).unref();
    await Promise.all([ipc.connect(ipcHandler), ipcB.connect(ipcBHandler)]);
    IPC.init(context.globalState.get(VOLUME_KEY, 85));
  }
}
