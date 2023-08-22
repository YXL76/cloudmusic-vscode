import { AccountManager, BUTTON_MANAGER } from "../manager/index.js";
import { AccountViewProvider, IPC, LyricType, STATE, defaultLyric } from "../utils/index.js";
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
} from "../constant/index.js";
import { IPCApi, IPCControl, IPCPlayer, IPCQueue, IPCWasm, logFile } from "@cloudmusic/shared";
import type { IPCBroadcastMsg, IPCServerMsg } from "@cloudmusic/shared";
import type { NeteaseAPIKey, NeteaseAPISMsg } from "@cloudmusic/server";
import { PlaylistProvider, RadioProvider } from "../treeview/index.js";
import { Uri, commands, window, workspace } from "vscode";
import { readdir, rm } from "node:fs/promises";
import type { ExtensionContext } from "vscode";
import type { PlayTreeItemData } from "../treeview/index.js";
import { QueueProvider } from "../treeview/index.js";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const ipcBHandler = (data: IPCBroadcastMsg) => {
  switch (data.t) {
    case IPCPlayer.load:
      return (STATE.loading = true);
    case IPCPlayer.loaded:
      return (STATE.loading = false);
    case IPCPlayer.repeat:
      return (STATE.repeat = data.r);
    case IPCQueue.add:
      return QueueProvider.add(<readonly PlayTreeItemData[]>data.items, data.index);
    case IPCQueue.clear:
      return QueueProvider.clear();
    case IPCQueue.delete:
      return QueueProvider.delete(data.id);
    case IPCQueue.new:
      QueueProvider.new(<readonly PlayTreeItemData[]>data.items, data.id);
      return STATE.downInit(); // 1
    case IPCQueue.play:
      return QueueProvider.top(data.id);
    case IPCQueue.shift:
      return QueueProvider.shift(data.index);
  }
};

export async function initIPC(context: ExtensionContext): Promise<void> {
  const ipcHandler = (data: IPCServerMsg | NeteaseAPISMsg<NeteaseAPIKey>) => {
    switch (data.t) {
      case IPCApi.netease: {
        const req = IPC.requestPool.get(data.channel);
        if (!req) break;
        IPC.requestPool.delete(data.channel);
        if (("err" in data && data.err) || !("msg" in data)) req.reject();
        else req.resolve(data.msg);
        return;
      }
      case IPCControl.netease:
        AccountManager.accounts.clear();
        data.profiles.forEach((i) => AccountManager.accounts.set(i.userId, i));
        PlaylistProvider.refresh();
        RadioProvider.refresh();
        AccountViewProvider.account(data.profiles);
        STATE.downInit(); // 2
        if (STATE.master) {
          if (!data.cookies.length) IPC.clear();
          void context.secrets.store(COOKIE_KEY, JSON.stringify(data.cookies));
        }
        return;
      case IPCControl.master:
        return (STATE.master = !!data.is);
      case IPCControl.new:
        return IPC.new();
      case IPCControl.retain:
        QueueProvider.new(<readonly PlayTreeItemData[]>data.items);
        return STATE.downInit(data.play, data.seek); // 1
      case IPCPlayer.end:
        if (!data.fail && (STATE.repeat || data.reloadNseek)) IPC.load(!data.pause, data.reloadNseek);
        else void commands.executeCommand("cloudmusic.next");
        return;
      case IPCPlayer.loaded:
        return (STATE.loading = false);
      case IPCPlayer.lyric:
        return (STATE.lyric = { ...STATE.lyric, ...data.lyric });
      case IPCPlayer.lyricIndex: {
        const lyric = STATE.lyric.text?.[data.idx];
        BUTTON_MANAGER.buttonLyric(lyric[STATE.lyric.type] || lyric[LyricType.ori]);
        return STATE.lyric.updateIndex?.(data.idx);
      }
      case IPCPlayer.pause:
        BUTTON_MANAGER.buttonPlay(false);
        return AccountViewProvider.pause();
      case IPCPlayer.play:
        BUTTON_MANAGER.buttonPlay(true);
        return AccountViewProvider.play();
      case IPCPlayer.stop:
        BUTTON_MANAGER.buttonSong();
        BUTTON_MANAGER.buttonLyric();
        STATE.lyric = { ...STATE.lyric, ...defaultLyric };
        return AccountViewProvider.stop();
      case IPCPlayer.volume:
        return BUTTON_MANAGER.buttonVolume(data.level);
      case IPCPlayer.next:
        return void commands.executeCommand("cloudmusic.next");
      case IPCPlayer.previous:
        return void commands.executeCommand("cloudmusic.previous");
      case IPCPlayer.speed:
        return BUTTON_MANAGER.buttonSpeed(data.speed);
      case IPCQueue.fm:
        return (STATE.fmUid = data.uid);
      case IPCWasm.load:
        return AccountViewProvider.wasmLoad(data.path, data.play, data.seek);
      case IPCWasm.pause:
        return AccountViewProvider.wasmPause();
      case IPCWasm.play:
        return AccountViewProvider.wasmPlay();
      case IPCWasm.stop:
        return AccountViewProvider.wasmStop();
      case IPCWasm.volume:
        return AccountViewProvider.wasmVolume(data.level);
      case IPCWasm.speed:
        return AccountViewProvider.wasmSpeed(data.speed);
      case IPCWasm.seek:
        return AccountViewProvider.wasmSeek(data.seekOffset);
    }
  };

  const logPath = resolve(SETTING_DIR, logFile);
  commands.registerCommand("cloudmusic.openLogFile", () => void window.showTextDocument(Uri.file(logPath)));

  try {
    const firstTry = await IPC.connect(ipcHandler, ipcBHandler, 0);
    if (firstTry.includes(false)) throw Error;
  } catch {
    STATE.first = true;
    STATE.downInit(); // 1

    const httpProxy =
      PROXY ||
      workspace.getConfiguration("http").get<string>("proxy") ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY;
    const ipcServerPath = resolve(context.extensionPath, "dist", "server.mjs");
    const conf = CONF();
    const errlogHandle = await open(logPath, "a");
    spawn(process.execPath, [...process.execArgv, ipcServerPath], {
      detached: true,
      shell: false,
      stdio: ["ignore", "ignore", errlogHandle.fd],
      env: {
        ...process.env,
        /* eslint-disable @typescript-eslint/naming-convention */
        ...(STRICT_SSL ? {} : { NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
        ...(httpProxy ? { GLOBAL_AGENT_HTTP_PROXY: httpProxy } : {}),
        CM_SETTING_DIR: SETTING_DIR,
        CM_NATIVE_MODULE: NATIVE_MODULE,
        CM_VOLUME: context.globalState.get(VOLUME_KEY, 85).toString(),
        CM_SPEED: context.globalState.get(SPEED_KEY, 1).toString(),
        CM_WASM: STATE.wasm ? "1" : "0",
        CM_MUSIC_QUALITY: MUSIC_QUALITY(conf).toString(),
        CM_MUSIC_CACHE_SIZE: MUSIC_CACHE_SIZE(conf).toString(),
        CM_HTTPS_API: HTTPS_API(conf) ? "1" : "0",
        CM_FOREIGN: FOREIGN(conf) ? "1" : "0",
        /* eslint-enable @typescript-eslint/naming-convention */
      },
    }).unref();
    await errlogHandle.close();
    await IPC.connect(ipcHandler, ipcBHandler);
    STATE.master = true;
    readdir(SETTING_DIR, { withFileTypes: true })
      .then((dirents) =>
        dirents
          .filter((dirent) => dirent.isFile() && dirent.name.startsWith("err-") && dirent.name !== logFile)
          .map((dirent) => resolve(SETTING_DIR, dirent.name))
          .forEach((p) => void rm(p, { recursive: true, force: true }).catch(console.error)),
      )
      .catch(console.error);
  }
}
