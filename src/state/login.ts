import { AccountManager, ButtonManager } from "../manager";
import { PlaylistProvider } from "../provider";
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
        PlaylistProvider.refresh(undefined, undefined, true);
      } else {
        ButtonManager.buttonAccountSignin();
        ButtonManager.hide();
      }
      commands.executeCommand("cloudmusic.clearQueue");
    }
  }
}
