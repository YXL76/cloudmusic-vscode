import { AccountManager, ButtonManager } from "../manager";
import { PlaylistProvider } from "../provider";
import { apiCache } from "../util";
import { apiUserLevel } from "../api";
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
      } else {
        apiCache.del("user_level");
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
      }
      void commands.executeCommand("cloudmusic.clearQueue");
    }
  }
}
