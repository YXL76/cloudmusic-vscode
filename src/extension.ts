import { ExtensionContext, ProgressLocation, window, workspace } from "vscode";
import { LyricCache, MusicCache, player } from "./util";
import { TMP_DIR } from "./constant";
import { steps } from "./activate";

export function activate(context: ExtensionContext): void {
  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "Cloudmusic initialization",
      cancellable: true,
    },
    async (progress) => {
      let percentage = 0;
      const unit = Math.floor(100 / steps.length);

      for (const step of steps) {
        progress.report({
          increment: percentage,
          message: "Initializing...",
        });
        await step(context);
        percentage += unit;
      }

      progress.report({
        increment: percentage,
        message: "Initialization ended",
      });

      return new Promise((resolve) => {
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
