import { commands, window } from "vscode";
import { AccountManager } from "../manager/index.js";
import type { ExtensionContext } from "vscode";
import { MultiStepInput } from "../utils/index.js";
import i18n from "../i18n/index.js";

export async function initAccount(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.addAccount", () => AccountManager.loginQuickPick()),

    commands.registerCommand(
      "cloudmusic.account",
      () =>
        void MultiStepInput.run(async (input) => {
          const pick = await input.showQuickPick({
            title: i18n.word.account,
            step: 1,
            items: [...AccountManager.accounts].map(([uid, { nickname }]) => ({
              label: `$(account) ${nickname}`,
              uid,
            })),
          });
          AccountManager.accountQuickPick(pick.uid);
        }),
    ),

    commands.registerCommand(
      "cloudmusic.dailyCheck",
      async () =>
        void window.showInformationMessage(
          (await AccountManager.dailyCheck()) ? i18n.sentence.success.dailyCheck : i18n.sentence.error.needSignIn,
        ),
    ),
  );

  await AccountManager.init();
}
