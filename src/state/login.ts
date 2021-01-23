import { AccountManager, ButtonManager } from "../manager";
import { PlaylistProvider, QueueProvider } from "../provider";
import { apiCache, songsItem2TreeItem } from "../util";
import { apiRecommendSongs, apiUserLevel } from "../api";
import { commands } from "vscode";

export class LoggedIn {
  private static state = false;

  static get() {
    return this.state;
  }

  static set(newValue: boolean) {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        void apiUserLevel();
        ButtonManager.buttonAccountAccount(AccountManager.nickname);
        ButtonManager.show();
        PlaylistProvider.refresh({ refresh: true });
        apiRecommendSongs()
          .then((songs) => {
            QueueProvider.refresh(() => {
              QueueProvider.clear();
              QueueProvider.add(songsItem2TreeItem(0, songs));
            });
          })
          .catch(() => {});
      } else {
        apiCache.del("user_level");
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
        QueueProvider.clear();
      }
      void commands.executeCommand("cloudmusic.clearQueue");
    }
  }
}
