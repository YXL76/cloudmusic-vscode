import { commands, window } from "vscode";
import { AccountManager } from "../manager";
import type { ExtensionContext } from "vscode";
import i18n from "../i18n";

export async function initAccount(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.addAccount", () =>
      AccountManager.loginQuickPick()
    ),

    commands.registerCommand(
      "cloudmusic.dailyCheck",
      async () =>
        void window.showInformationMessage(
          (await AccountManager.dailyCheck())
            ? i18n.sentence.success.dailyCheck
            : i18n.sentence.error.needSignIn
        )
    )
  );

  await AccountManager.init();
}
