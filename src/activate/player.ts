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
      // NATIVE.startKeyboardEvent((res) => {
      //   if (res === "prev") {
      //     void commands.executeCommand("cloudmusic.previous");
      //   } else if (res === "play") {
      //     void commands.executeCommand("cloudmusic.play");
      //   } else if (res === "next") {
      //     void commands.executeCommand("cloudmusic.next");
      //   }
      // });
    }
  }
}
