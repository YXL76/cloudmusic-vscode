import { LyricCache, MusicCache, player } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
import {
  initAccount,
  initCache,
  initCommand,
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
  initPlayer(context);
  initQueue();
  initPlaylist();
  initCommand(context);
  initStatusBar(context);
  initAccount(context);
  initSearch(context);
  await initCache();
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  void workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
