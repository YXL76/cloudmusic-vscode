import * as crypto from "crypto";
import { ExtensionContext, commands, window } from "vscode";
import { unlink, writeFile } from "fs";
import { ACCOUNT_FILE } from "../../constant";
import { AccountManager } from "../../manager";
import { LoggedIn } from "../../state";
import { MultiStepInput } from "../../util";
import { WebView } from "../../page";
import { i18n } from "../../i18n";

export function account(context: ExtensionContext): void {
  const webview = WebView.getInstance(context.extensionPath);

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.account", async () => {
      const pick = await window.showQuickPick([
        {
          label: AccountManager.nickname,
          description: i18n.word.user,
          type: 0,
        },
        {
          label: i18n.word.personalFm,
          type: 1,
        },
        {
          label: i18n.word.userRankingList,
          description: i18n.word.weekly,
          id: "userMusicRankingWeekly",
          queryType: 1,
          type: 2,
        },
        {
          label: i18n.word.userRankingList,
          description: i18n.word.allTime,
          id: "userMusicRankingAllTime",
          queryType: 0,
          type: 2,
        },
        {
          label: i18n.word.signOut,
          type: 3,
        },
      ]);
      if (!pick) {
        return;
      }
      switch (pick.type) {
        case 1:
          commands.executeCommand("cloudmusic.personalFM");
          break;
        case 2:
          webview.userMusicRanking(
            `${pick.id}`,
            `${pick.label} (${pick.description})`,
            // @ts-ignore
            pick.queryType
          );
          break;
        case 3:
          commands.executeCommand("cloudmusic.signout");
          break;
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.signin", async () => {
      if (LoggedIn.get()) {
        return;
      }

      const title = i18n.word.signIn;
      const totalSteps = 3;

      type State = {
        phone: boolean;
        account: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        md5_password: string;
      };

      const state = {} as State;
      await MultiStepInput.run((input) => pickMethod(input));
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { phone, account, md5_password } = state;
      if (
        md5_password &&
        (await AccountManager.login(phone, account, md5_password))
      ) {
        writeFile(ACCOUNT_FILE, JSON.stringify(state), () => {
          //
        });
        window.showInformationMessage(i18n.sentence.success.signIn);
      } else {
        window.showErrorMessage(i18n.sentence.fail.signIn);
      }

      async function pickMethod(input: MultiStepInput) {
        const pick = await input.showQuickPick({
          title,
          step: 1,
          totalSteps,
          items: [
            {
              label: `✉ ${i18n.word.email}`,
              description: i18n.sentence.label.email,
              phone: false,
            },
            {
              label: `📱 ${i18n.word.cellphone}`,
              description: i18n.sentence.label.cellphone,
              phone: true,
            },
          ],
          placeholder: i18n.sentence.hint.signIn,
        });
        state.phone = pick.phone;
        return (input: MultiStepInput) => inputAccount(input);
      }

      async function inputAccount(input: MultiStepInput) {
        state.account = await input.showInputBox({
          title,
          step: 2,
          totalSteps,
          value: state.account,
          prompt: i18n.sentence.hint.account,
        });
        return (input: MultiStepInput) => inputPassword(input);
      }

      async function inputPassword(input: MultiStepInput) {
        const password = await input.showInputBox({
          title,
          step: 3,
          totalSteps,
          prompt: i18n.sentence.hint.password,
          password: true,
        });

        state.md5_password = crypto
          .createHash("md5")
          .update(password)
          .digest("hex");
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.dailyCheck", () => {
      AccountManager.dailySignin();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.signout", () => {
      if (AccountManager.logout()) {
        try {
          unlink(ACCOUNT_FILE, () => {
            //
          });
        } catch {}
      }
    })
  );
}
