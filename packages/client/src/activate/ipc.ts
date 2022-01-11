import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC, State } from "../utils";
import { COOKIE_KEY, SETTING_DIR, STRICT_SSL } from "../constant";
import type { IPCBroadcastMsg, IPCServerMsg } from "@cloudmusic/shared";
import type { NeteaseAPIKey, NeteaseAPISMsg } from "@cloudmusic/server";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  RadioProvider,
} from "../treeview";
import { commands, workspace } from "vscode";
import { readdir, unlink } from "fs/promises";
import type { ExtensionContext } from "vscode";
import type { PlayTreeItemData } from "../treeview";
import { QueueProvider } from "../treeview";
import { openSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case "player.load":
      State.loading = true;
      break;
    case "player.loaded":
      State.loading = false;
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

const getDate = /-(\d+)$/;
const rejectTimout = () => {
  const now = Date.now();
  for (const [k, { reject }] of IPC.requestPool) {
    const [, date] = getDate.exec(k as string) as RegExpExecArray;
    if (parseInt(date) - now > 40000) {
      IPC.requestPool.delete(k);
      reject();
    } else break;
  }
};

setInterval(rejectTimout, 60000);

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
      case "control.netease":
        AccountManager.accounts.clear();
        data.profiles.forEach((i) => AccountManager.accounts.set(i.userId, i));
        PlaylistProvider.refresh();
        RadioProvider.refresh();
        AccountViewProvider.account(data.profiles);
        State.first = false;
        if (State.master) {
          if (!data.cookies.length) IPC.clear();
          void context.secrets.store(COOKIE_KEY, JSON.stringify(data.cookies));
        }
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
      case "player.loaded":
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
          o: { time: [0], text: ["$(text-size)"] },
          t: { time: [0], text: ["$(text-size)"] },
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
      case "wasm.load":
        AccountViewProvider.wasmLoad(data.path);
        break;
      case "wasm.pause":
        AccountViewProvider.wasmPause();
        break;
      case "wasm.play":
        AccountViewProvider.wasmPlay();
        break;
      case "wasm.stop":
        AccountViewProvider.wasmStop();
        break;
      case "wasm.volume":
        AccountViewProvider.wasmVolume(data.level);
        break;
    }
  };

  try {
    const firstTry = await IPC.connect(ipcHandler, ipcBHandler, 0);
    if (firstTry.includes(false)) throw Error;
  } catch {
    State.first = true;
    const version = (context.extension.packageJSON as { version: string })
      .version;
    const log = `err-${version}.log`;
    const logPath = resolve(SETTING_DIR, log);
    const httpProxy =
      workspace.getConfiguration("http").get<string>("proxy") ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY;
    const ipcServerPath = resolve(context.extensionPath, "dist", "server.js");
    spawn(process.execPath, [...process.execArgv, ipcServerPath], {
      detached: true,
      shell: false,
      stdio: ["ignore", "ignore", openSync(logPath, "a")],
      env: {
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(STRICT_SSL ? {} : { NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(httpProxy ? { GLOBAL_AGENT_HTTP_PROXY: httpProxy } : {}),
      },
    }).unref();
    await IPC.connect(ipcHandler, ipcBHandler);
    readdir(SETTING_DIR, { withFileTypes: true })
      .then((dirents) => {
        for (const dirent of dirents) {
          if (
            dirent.isFile() &&
            dirent.name.startsWith("err") &&
            dirent.name !== log
          )
            unlink(resolve(SETTING_DIR, dirent.name)).catch(console.error);
        }
      })
      .catch(console.error);
  }
}
