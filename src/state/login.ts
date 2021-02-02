import { AccountManager, ButtonManager } from "../manager";
import { DjRadioProvider, PlaylistProvider, QueueProvider } from "../provider";
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
      apiCache.flushAll();
      PlaylistProvider.refresh();
      DjRadioProvider.refresh();
      if (newValue) {
        void apiUserLevel();
        ButtonManager.buttonAccountAccount(AccountManager.nickname);
        ButtonManager.show();
        apiRecommendSongs()
          .then((songs) => {
            QueueProvider.refresh(() => {
              QueueProvider.clear();
              QueueProvider.add(songsItem2TreeItem(0, songs));
            });
          })
          .catch(() => {});
      } else {
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
        void commands.executeCommand("cloudmusic.clearQueue");
      }
    }
  }
}
