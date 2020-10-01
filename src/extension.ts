import { LyricCache, MusicCache, player } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
import { commands, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { LoggedIn } from "./state";
import { i18n } from "./i18n";
import { steps } from "./activate";

export function activate(context: ExtensionContext): void {
  void (async () => {
    await workspace.fs.createDirectory(SETTING_DIR);
    await workspace.fs.createDirectory(TMP_DIR);
    await Promise.all(steps.map((step) => step(context)));

    if (!LoggedIn.get()) {
      void window
        .showInformationMessage(i18n.sentence.hint.trySignIn, i18n.word.signIn)
        .then((result) => {
          if (result === i18n.word.signIn) {
            void commands.executeCommand("cloudmusic.signin");
          }
        });
    }
  })();
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  void workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
