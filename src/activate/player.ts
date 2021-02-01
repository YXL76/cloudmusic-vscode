import { Player } from "../util";

export function initPlayer() {
  Player.init();

  /* if (MEDIA_CONTROL) {
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
    } */
}
