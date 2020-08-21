import { LyricCache, MusicCache, player } from "./util";
import { ExtensionContext } from "vscode";
import { TMP_DIR } from "./constant";
import { steps } from "./activate";
import del = require("del");

export function activate(context: ExtensionContext): void {
  for (const progress of steps) {
    progress(context);
  }
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  del.sync([TMP_DIR], { force: true });
}
