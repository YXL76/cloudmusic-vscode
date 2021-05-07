import { AccountManager, ButtonManager } from "./manager";
import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  SETTING_DIR,
  TMP_DIR,
} from "./constant";
import {
  initAccount,
  initCache,
  initCommand,
  initIPC,
  initLocal,
  initPlaylist,
  initQueue,
  initRadio,
  initStatusBar,
} from "./activate";
import type { ExtensionContext } from "vscode";
// import { fork } from "child_process";
// import { rmdirSync } from "fs";
import { workspace } from "vscode";

export async function activate(context: ExtensionContext): Promise<void> {
  // fork("", { detached: true, silent: true });
  await workspace.fs.createDirectory(SETTING_DIR);
  await Promise.allSettled([
    workspace.fs.createDirectory(TMP_DIR),
    workspace.fs.createDirectory(CACHE_DIR),
  ]);
  await Promise.allSettled([
    workspace.fs.createDirectory(LYRIC_CACHE_DIR),
    workspace.fs.createDirectory(MUSIC_CACHE_DIR),
  ]);
  await initIPC();
  AccountManager.context = context;
  ButtonManager.context = context;
  initQueue(context);
  initPlaylist(context);
  initRadio(context);
  initCommand(context);
  initStatusBar(context);
  void initAccount(context);
  void initCache(context);
  initLocal(context);
}

export function deactivate(): void {
  /* MusicCache.store();
  try {
    rmdirSync(TMP_DIR.fsPath, { recursive: true });
  } catch {} */
}
