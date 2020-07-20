import { commands } from "vscode";
import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";

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
        ButtonManager.hide();
      }
      commands.executeCommand("cloudmusic.clearQueue");
    }
  }
}
