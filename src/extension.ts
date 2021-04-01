import {
  ACCOUNT_KEY,
  CACHE_DIR,
  COOKIE_KEY,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  SETTING_DIR,
  TMP_DIR,
} from "./constant";
import { AccountManager, ButtonManager } from "./manager";
import { MusicCache, Player } from "./util";
import {
  initAccount,
  initCache,
  initCommand,
  initLocal,
  initPlayer,
  initPlaylist,
  initQueue,
  initRadio,
  initStatusBar,
} from "./activate";
import type { ExtensionContext } from "vscode";
import { rmdirSync } from "fs";
import { workspace } from "vscode";

export async function activate(context: ExtensionContext): Promise<void> {
  void context.globalState.update(ACCOUNT_KEY, undefined);
  void context.globalState.update(COOKIE_KEY, undefined);
  await workspace.fs.createDirectory(SETTING_DIR);
  await Promise.all([
    workspace.fs.createDirectory(TMP_DIR),
    workspace.fs.createDirectory(CACHE_DIR),
  ]);
  await Promise.all([
    workspace.fs.createDirectory(LYRIC_CACHE_DIR),
    workspace.fs.createDirectory(MUSIC_CACHE_DIR),
  ]);
  AccountManager.context = context;
  ButtonManager.context = context;
  Player.context = context;
  initPlayer();
  initQueue();
  initPlaylist();
  initRadio();
  initCommand(context);
  initStatusBar();
  void initAccount(context);
  void initCache(context);
  initLocal(context);
}

export function deactivate(): void {
  Player.stop();
  MusicCache.store();
  try {
    rmdirSync(TMP_DIR.fsPath, { recursive: true });
  } catch {}
}
