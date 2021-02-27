import { MEDIA_CONTROL, NATIVE } from "../constant";
import { Player } from "../util";
import { commands } from "vscode";

export function initPlayer(): void {
  Player.init();

  if (MEDIA_CONTROL) {
    NATIVE.startKeyboardEvent((res: number) => {
      switch (res) {
        case 0:
          void commands.executeCommand("cloudmusic.previous");
          break;
        case 1:
          void commands.executeCommand("cloudmusic.play");
          break;
        case 2:
          void commands.executeCommand("cloudmusic.next");
          break;
      }
    });
  }
}
