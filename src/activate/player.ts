import { MEDIA_CONTROL, NATIVE, PLAYER_AVAILABLE } from "../constant";
import { commands, window } from "vscode";
import { i18n } from "../i18n";
import { lock } from "../state";
import { player } from "../util";

export async function initPlayer(): Promise<void> {
  if (!PLAYER_AVAILABLE) {
    lock.playerLoad.set(true);
    await window.showErrorMessage(i18n.sentence.error.systemSupport);
  } else {
    player.volume(85);
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
