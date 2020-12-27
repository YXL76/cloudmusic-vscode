import { LyricCache, MusicCache, player } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
import { commands, window, workspace } from "vscode";
import {
  initAccount,
  initCache,
  initCommand,
  initPlayer,
  initPlaylist,
  initQueue,
  initStatusBar,
} from "./activate";
import type { ExtensionContext } from "vscode";
import { LoggedIn } from "./state";
import { i18n } from "./i18n";

export async function activate(context: ExtensionContext) {
  await workspace.fs.createDirectory(SETTING_DIR);
  await workspace.fs.createDirectory(TMP_DIR);
  await Promise.all(
    [
      initPlayer,
      initQueue,
      initPlaylist,
      initCache,
      initStatusBar,
      initCommand,
    ].map((step) => step(context))
  );

  await initAccount(context);

  if (!LoggedIn.get()) {
    void window
      .showInformationMessage(i18n.sentence.hint.trySignIn, i18n.word.signIn)
      .then((result) => {
        if (result === i18n.word.signIn) {
          void commands.executeCommand("cloudmusic.signin");
        }
      });
  }
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  void workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
