import { AccountManager, ButtonManager } from "./manager";
import { LyricCache, MusicCache, WebView, player } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
import {
  initAccount,
  initCache,
  initCommand,
  initLocal,
  initPlayer,
  initPlaylist,
  initQueue,
  initSearch,
  initStatusBar,
} from "./activate";
import type { ExtensionContext } from "vscode";
import { workspace } from "vscode";

export async function activate(context: ExtensionContext) {
  await workspace.fs.createDirectory(SETTING_DIR);
  await workspace.fs.createDirectory(TMP_DIR);
  AccountManager.context = context;
  WebView.initInstance(context.extensionUri);
  ButtonManager.init(context);
  initPlayer(context);
  initQueue();
  initPlaylist();
  initCommand(context);
  initStatusBar();
  initAccount(context);
  initSearch(context);
  await initCache();
  initLocal(context);
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  void workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
