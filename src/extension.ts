import { ExtensionContext, ProgressLocation, window } from "vscode";
import { LyricCache, MusicCache, player } from "./util";
import { TMP_DIR } from "./constant";
import { steps } from "./activate";
import del = require("del");

export function activate(context: ExtensionContext): void {
  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "Cloudmusic initialization",
      cancellable: true,
    },
    (progress) => {
      let percentage = 0;
      const unit = Math.floor(100 / steps.length);

      for (const step of steps) {
        progress.report({
          increment: percentage,
          message: "Initializing...",
        });
        step(context);
        percentage += unit;
      }

      progress.report({
        increment: percentage,
        message: "Initialization ended",
      });

      return new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
    }
  );
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  del.sync([TMP_DIR], { force: true });
}
