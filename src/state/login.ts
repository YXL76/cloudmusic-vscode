import { AccountManager, ButtonManager } from "../manager";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
  RadioProvider,
} from "../treeview";
import { apiRecommendSongs, apiUserLevel } from "../api";
import { apiCache } from "../util";
import { commands } from "vscode";

export class LoggedIn {
  private static state = false;

  static get get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      apiCache.flushAll();
      PlaylistProvider.refresh();
      RadioProvider.refresh();
      if (newValue) {
        void apiUserLevel();
        ButtonManager.buttonAccountAccount(AccountManager.nickname);
        ButtonManager.show();
        void apiRecommendSongs().then((songs) => {
          QueueProvider.refresh(() => {
            QueueProvider.clear();
            QueueProvider.add(
              songs.map((song) => new QueueItemTreeItem(song, 0))
            );
          });
        });
      } else {
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
        void commands.executeCommand("cloudmusic.clearQueue");
      }
    }
  }
}
