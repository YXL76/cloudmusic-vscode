import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC, State, defaultLyric } from "../utils";
import {
  CONF,
  COOKIE_KEY,
  FOREIGN,
  HTTPS_API,
  MUSIC_CACHE_SIZE,
  MUSIC_QUALITY,
  NATIVE_MODULE,
  PROXY,
  SETTING_DIR,
  SPEED_KEY,
  STRICT_SSL,
  VOLUME_KEY,
} from "../constant";
import {
  IPCApi,
  IPCControl,
  IPCPlayer,
  IPCQueue,
  IPCWasm,
  logFile,
} from "@cloudmusic/shared";
import type { IPCBroadcastMsg, IPCServerMsg } from "@cloudmusic/shared";
import type { NeteaseAPIKey, NeteaseAPISMsg } from "@cloudmusic/server";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  RadioProvider,
} from "../treeview";
import { Uri, commands, window, workspace } from "vscode";
import { readdir, rm } from "node:fs/promises";
import type { ExtensionContext } from "vscode";
import type { PlayTreeItemData } from "../treeview";
import { QueueProvider } from "../treeview";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case IPCPlayer.load:
      State.loading = true;
      break;
    case IPCPlayer.loaded:
      State.loading = false;
      break;
    case IPCPlayer.repeat:
      State.repeat = data.r;
      break;
    case IPCQueue.add:
      QueueProvider.add(data.items as readonly PlayTreeItemData[], data.index);
      break;
    case IPCQueue.clear:
      QueueProvider.clear();
      break;
    case IPCQueue.delete:
      QueueProvider.delete(data.id);
      break;
    case IPCQueue.new:
      QueueProvider.new(data.items as readonly PlayTreeItemData[], data.id);
      State.downInit(); // 1
      break;
    case IPCQueue.play:
      QueueProvider.top(data.id);
      break;
    case IPCQueue.shift:
      QueueProvider.shift(data.index);
      break;
  }
};

export async function initIPC(context: ExtensionContext): Promise<void> {
  const ipcHandler = (data: IPCServerMsg | NeteaseAPISMsg<NeteaseAPIKey>) => {
    switch (data.t) {
      case IPCApi.netease:
        {
          const req = IPC.requestPool.get(data.channel);
          if (!req) break;
          IPC.requestPool.delete(data.channel);
          if (
            typeof data.msg === "object" &&
            data.msg !== null &&
            "err" in data.msg
          ) {
            req.reject();
          } else req.resolve(data.msg);
        }
        break;
      case IPCControl.netease:
        AccountManager.accounts.clear();
        data.profiles.forEach((i) => AccountManager.accounts.set(i.userId, i));
        PlaylistProvider.refresh();
        RadioProvider.refresh();
        AccountViewProvider.account(data.profiles);
        State.downInit(); // 2
        if (State.master) {
          if (!data.cookies.length) IPC.clear();
          void context.secrets.store(COOKIE_KEY, JSON.stringify(data.cookies));
        }
        break;
      case IPCControl.master:
        State.master = !!data.is;
        break;
      case IPCControl.new:
        IPC.new();
        break;
      case IPCControl.retain:
        if (data.items.length && State.wasm) {
          // Delay it because `this._instance._onDidChangeTreeData.fire()` is async
          State.addOnceInitCallback(() =>
            setTimeout(() => IPC.load(data.play), 1024)
          );
        }
        QueueProvider.new(data.items as PlayTreeItemData[]);
        State.downInit(); // 1
        break;
      case IPCPlayer.end:
        if (!data.fail && State.repeat) IPC.load();
        else void commands.executeCommand("cloudmusic.next");
        break;
      case IPCPlayer.loaded:
        State.loading = false;
        break;
      case IPCPlayer.lyric:
        State.lyric = {
          ...State.lyric,
          ...data.lyric,
        };
        break;
      case IPCPlayer.lyricIndex:
        ButtonManager.buttonLyric(
          State.lyric.text?.[data.idx]?.[State.lyric.type]
        );
        State.lyric.updateIndex?.(data.idx);
        break;
      case IPCPlayer.pause:
        ButtonManager.buttonPlay(false);
        AccountViewProvider.pause();
        break;
      case IPCPlayer.play:
        ButtonManager.buttonPlay(true);
        AccountViewProvider.play();
        break;
      case IPCPlayer.stop:
        ButtonManager.buttonSong();
        ButtonManager.buttonLyric();
        State.lyric = {
          ...State.lyric,
          ...defaultLyric,
        };
        AccountViewProvider.stop();
        break;
      case IPCPlayer.volume:
        ButtonManager.buttonVolume(data.level);
        break;
      case IPCPlayer.next:
        void commands.executeCommand("cloudmusic.next");
        break;
      case IPCPlayer.previous:
        void commands.executeCommand("cloudmusic.previous");
        break;
      case IPCPlayer.speed:
        ButtonManager.buttonSpeed(data.speed);
        break;
      case IPCQueue.fm:
        State.fm = true;
        break;
      case IPCQueue.fmNext:
        State.playItem = QueueItemTreeItem.new({
          ...data.item,
          pid: data.item.al.id,
        });
        break;
      case IPCWasm.load:
        AccountViewProvider.wasmLoad(data.path, data.play);
        break;
      case IPCWasm.pause:
        AccountViewProvider.wasmPause();
        break;
      case IPCWasm.play:
        AccountViewProvider.wasmPlay();
        break;
      case IPCWasm.stop:
        AccountViewProvider.wasmStop();
        break;
      case IPCWasm.volume:
        AccountViewProvider.wasmVolume(data.level);
        break;
      case IPCWasm.speed:
        AccountViewProvider.wasmSpeed(data.speed);
        break;
      case IPCWasm.seek:
        AccountViewProvider.wasmSeek(data.seekOffset);
        break;
    }
  };

  const logPath = resolve(SETTING_DIR, logFile);
  commands.registerCommand(
    "cloudmusic.openLogFile",
    () => void window.showTextDocument(Uri.file(logPath))
  );

  try {
    const firstTry = await IPC.connect(ipcHandler, ipcBHandler, 0);
    if (firstTry.includes(false)) throw Error;
  } catch {
    State.first = true;
    State.downInit(); // 1

    const httpProxy =
      PROXY ||
      workspace.getConfiguration("http").get<string>("proxy") ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY;
    const ipcServerPath = resolve(context.extensionPath, "dist", "server.mjs");
    const conf = CONF();
    spawn(process.execPath, [...process.execArgv, ipcServerPath], {
      detached: true,
      shell: false,
      stdio: ["ignore", "ignore", (await open(logPath, "a")).fd],
      env: {
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(STRICT_SSL ? {} : { NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(httpProxy ? { GLOBAL_AGENT_HTTP_PROXY: httpProxy } : {}),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_SETTING_DIR: SETTING_DIR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_NATIVE_MODULE: NATIVE_MODULE,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_VOLUME: context.globalState.get(VOLUME_KEY, 85).toString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_SPEED: context.globalState.get(SPEED_KEY, 1).toString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_WASM: State.wasm ? "1" : "0",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_MUSIC_QUALITY: MUSIC_QUALITY(conf).toString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_MUSIC_CACHE_SIZE: MUSIC_CACHE_SIZE(conf).toString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_HTTPS_API: HTTPS_API(conf) ? "1" : "0",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CM_FOREIGN: FOREIGN(conf) ? "1" : "0",
      },
    }).unref();
    await IPC.connect(ipcHandler, ipcBHandler);
    State.master = true;
    readdir(SETTING_DIR, { withFileTypes: true })
      .then((dirents) => {
        for (const dirent of dirents) {
          if (
            dirent.isFile() &&
            dirent.name.startsWith("err-") &&
            dirent.name.endsWith(".log") &&
            dirent.name !== logFile
          )
            rm(resolve(SETTING_DIR, dirent.name), {
              recursive: true,
              force: true,
            }).catch(console.error);
        }
      })
      .catch(console.error);
  }
}
