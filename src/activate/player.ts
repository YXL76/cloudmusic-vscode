import { MEDIA_CONTROL, NATIVE, PLAYER_AVAILABLE } from "../constant";
import { commands, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { i18n } from "../i18n";
import { player } from "../util";

export function initPlayer(context: ExtensionContext) {
  if (!PLAYER_AVAILABLE) {
    void window.showErrorMessage(i18n.sentence.error.systemSupport);
  } else {
    player.init(context);
    if (MEDIA_CONTROL) {
      const handler = (res: number) => {
        switch (res) {
          case 0:
            break;
          case 1:
            void commands.executeCommand("cloudmusic.previous");
            break;
          case 2:
            void commands.executeCommand("cloudmusic.play");
            break;
          case 3:
            void commands.executeCommand("cloudmusic.next");
            break;
        }
        NATIVE.startKeyboardEvent(handler, res);
      };

      NATIVE.startKeyboardEvent(handler, 0);
    }
  }
}
