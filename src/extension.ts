import {
  ExtensionContext,
  ProgressLocation,
  commands,
  window,
  workspace
} from "vscode";
import { LyricCache, MusicCache, player } from "./util";
import { SETTING_DIR, TMP_DIR } from "./constant";
import { LoggedIn } from "./state";
import { i18n } from "./i18n";
import { steps } from "./activate";

export function activate(context: ExtensionContext): void {
  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "Cloudmusic initialization",
      cancellable: true
    },
    async progress => {
      await workspace.fs.createDirectory(SETTING_DIR);
      await workspace.fs.createDirectory(TMP_DIR);

      let percentage = 0;
      const unit = Math.floor(100 / steps.length);

      for (const step of steps) {
        progress.report({
          increment: percentage,
          message: "Initializing..."
        });
        await step(context);
        percentage += unit;
      }

      progress.report({
        increment: percentage,
        message: "Initialization ended"
      });

      if (!LoggedIn.get()) {
        window
          .showInformationMessage(
            i18n.sentence.hint.trySignIn,
            i18n.word.signIn
          )
          .then(result => {
            if (result === i18n.word.signIn) {
              commands.executeCommand("cloudmusic.signin");
            }
          });
      }

      return new Promise(resolve => {
        setTimeout(resolve, 1024);
      });
    }
  );
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  workspace.fs.delete(TMP_DIR, { recursive: true, useTrash: false });
}
