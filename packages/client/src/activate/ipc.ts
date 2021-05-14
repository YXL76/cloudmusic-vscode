import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC, State } from "../utils";
import { COOKIE_KEY, ICON, VOLUME_KEY } from "../constant";
import type {
  IPCBroadcastMsg,
  IPCServerMsg,
  NeteaseAPIKey,
  NeteaseAPISMsg,
} from "@cloudmusic/shared";
import type { ExtensionContext } from "vscode";
import { LOG_FILE } from "@cloudmusic/shared";
import type { PlayTreeItemData } from "../treeview";
import { QueueItemTreeItem } from "../treeview";
import { QueueProvider } from "../treeview";
import { commands } from "vscode";
import { fork } from "child_process";
import { openSync } from "fs";
import { resolve } from "path";

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case "control.login":
      AccountManager.uid = data.userId;
      AccountManager.nickname = data.nickname;
      AccountManager.likelist.clear();
      void IPC.netease("likelist", [data.userId]).then((ids) => {
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
      QueueProvider.add(data.items as readonly PlayTreeItemData[], data.index);
      break;
    case "queue.clear":
      QueueProvider.clear();
      break;
    case "queue.delete":
      QueueProvider.delete(data.id);
      break;
    case "queue.new":
      QueueProvider.new(data.items as readonly PlayTreeItemData[], data.id);
      break;
    case "queue.play":
      QueueProvider.top(data.id);
      break;
    case "queue.shift":
      QueueProvider.shift(data.index);
      break;
  }
};

/* const getDate = /-(\d+)$/;
const rejectTimout = () => {
  const now = Date.now();
  for (const [k, { reject }] of IPC.requestPool) {
    const [, date] = getDate.exec(k as string) as RegExpExecArray;
    if (parseInt(date) - now > 40000) {
      IPC.requestPool.delete(k);
      reject();
    } else break;
  }
}; */

export async function initIPC(context: ExtensionContext): Promise<void> {
  const ipcHandler = (data: IPCServerMsg | NeteaseAPISMsg<NeteaseAPIKey>) => {
    switch (data.t) {
      case "api.netease":
        {
          const req = IPC.requestPool.get(data.channel);
          IPC.requestPool.delete(data.channel);
          if (req) req.resolve(data.msg);
          // rejectTimout();
        }
        break;
      case "control.cookie":
        void context.secrets.store(COOKIE_KEY, data.cookie);
        break;
      case "control.master":
        State.master = !!data.is;
        break;
      case "control.new":
        IPC.new(QueueProvider.songs);
        break;
      case "control.retain":
        QueueProvider.new(data.items as PlayTreeItemData[]);
        State.loading = false;
        break;
      case "player.end":
        if (!data.fail && State.repeat) IPC.load();
        else void commands.executeCommand("cloudmusic.next");
        break;
      case "player.load":
        State.loading = false;
        break;
      case "player.lyric":
        State.lyric = {
          ...State.lyric,
          ...data.lyric,
        };
        break;
      case "player.lyricIndex":
        ButtonManager.buttonLyric(
          State.lyric[State.lyric.type].text?.[
            State.lyric.type === "o" ? data.oi : data.ti
          ]
        );
        State.lyric.updatePanel?.(data.oi, data.ti);
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
        State.lyric = {
          ...State.lyric,
          o: { time: [0], text: [ICON.lyric] },
          t: { time: [0], text: [ICON.lyric] },
        };
        AccountViewProvider.stop();
        break;
      case "player.volume":
        ButtonManager.buttonVolume(data.level);
        break;
      case "queue.fm":
        State.fm = data.is;
        break;
      case "queue.fmNext":
        State.playItem = QueueItemTreeItem.new({
          ...data.item,
          pid: data.item.al.id,
        });
        break;
    }
  };

  State.loading = true;
  try {
    const firstTry = await IPC.connect(ipcHandler, ipcBHandler, 0);
    if (firstTry.includes(false)) throw Error;
    State.first = false;
  } catch {
    State.loading = false;
    fork(resolve(__dirname, "server.js"), {
      detached: true,
      stdio: ["ignore", "ignore", openSync(LOG_FILE, "a"), "ipc"],
    }).unref();
    await IPC.connect(ipcHandler, ipcBHandler);
    IPC.init(context.globalState.get(VOLUME_KEY, 85));
  }
}
