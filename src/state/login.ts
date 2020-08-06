import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";
import { PlaylistProvider } from "../provider/playlistProvider";
import { commands } from "vscode";

export class LoggedIn {
  private static state = false;

  static get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonAccountAccount(AccountManager.nickname);
        ButtonManager.show();
        PlaylistProvider.refresh();
      } else {
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
      }
      commands.executeCommand("cloudmusic.clearQueue");
    }
  }
}
