import { player } from "../util/player";
import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";
import { PlaylistProvider } from "../provider/playlistProvider";
import { QueueProvider } from "../provider/queueProvider";

const queueProvider = QueueProvider.getInstance();

export class LoggedIn {
  private static state = false;

  static get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonAccount(
          "$(account)",
          AccountManager.nickname,
          "cloudmusic.account"
        );
        ButtonManager.show();
      } else {
        ButtonManager.buttonAccount(
          "$(account)",
          "Account",
          "cloudmusic.signin"
        );
        ButtonManager.buttonSong("Song", "");
        ButtonManager.hide();
        player.stop();
      }
      PlaylistProvider.refresh();
      queueProvider.clear();
      queueProvider.refresh();
    }
  }
}
