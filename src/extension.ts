import { AccountManager, ButtonManager } from "./manager";
import { LyricCache, MusicCache, Player, WebView } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
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
import { workspace } from "vscode";

export async function activate(context: ExtensionContext) {
  await workspace.fs.createDirectory(SETTING_DIR);
  await workspace.fs.createDirectory(TMP_DIR);
  AccountManager.context = context;
  ButtonManager.context = context;
  WebView.context = context;
  Player.context = context;
  initPlayer();
  initQueue();
  initPlaylist();
  initRadio();
  initCommand(context);
  initStatusBar();
  initAccount(context);
  initCache();
  initLocal(context);
}

export function deactivate(): void {
  Player.stop();
  MusicCache.verify();
  LyricCache.verify();
  void workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
