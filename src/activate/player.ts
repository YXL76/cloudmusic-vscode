import { ExtensionContext, commands, window } from "vscode";
import { MEDIA_CONTROL, NATIVE, PLAYER_AVAILABLE } from "../constant";
import { i18n } from "../i18n";
import { lock } from "../state";
import { player } from "../util";

export async function initPlayer(context: ExtensionContext): Promise<void> {
  if (!PLAYER_AVAILABLE) {
    lock.playerLoad.set(true);
    await window.showErrorMessage(i18n.sentence.error.systemSupport);
  } else {
    player.init(context);
    if (MEDIA_CONTROL) {
      const { startKeyboardEvent } = NATIVE;
      startKeyboardEvent((res) => {
        if (res === "prev") {
          commands.executeCommand("cloudmusic.previous");
        } else if (res === "play") {
          commands.executeCommand("cloudmusic.play");
        } else if (res === "next") {
          commands.executeCommand("cloudmusic.next");
        }
      });
    }
  }
}
