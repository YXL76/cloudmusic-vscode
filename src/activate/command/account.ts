import * as crypto from "crypto";
import { ACCOUNT_FILE, ICON } from "../../constant";
import {
  ExtensionContext,
  QuickPickItem,
  commands,
  window,
  workspace,
} from "vscode";
import {
  MultiStepInput,
  apiPersonalized,
  apiPersonalizedNewsong,
  apiRecommendResource,
  apiRecommendSongs,
  pickPlaylists,
  pickSongs,
} from "../../util";
import { AccountManager } from "../../manager";
import { LoggedIn } from "../../state";
import { WebView } from "../../page";
import { i18n } from "../../i18n";
import { inputKeyword } from "./search";

export function account(context: ExtensionContext): void {
  const webview = WebView.getInstance(context.extensionUri);

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.account", async () => {
      MultiStepInput.run((input) => pickType(input));

      async function pickType(input: MultiStepInput) {
        enum Type {
          user,
          fm,
          search,
          recommend,
          userMusicRankingListWeekly,
          userMusicRankingListAllTime,
          signOut,
        }
        interface T extends QuickPickItem {
          type: Type;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.account,
          step: 1,
          totalSteps: 1,
          items: [
            {
              label: `${ICON.artist} ${AccountManager.nickname}`,
              description: i18n.word.user,
              type: Type.user,
            },
            {
              label: `${ICON.fm} ${i18n.word.personalFm}`,
              type: Type.fm,
            },
            {
              label: `${ICON.search} ${i18n.word.search}`,
              type: Type.search,
            },
            {
              label: `$(symbol-color) ${i18n.word.recommendation}`,
              type: Type.recommend,
            },
            {
              label: `${ICON.playlist} ${i18n.word.userRankingList}`,
              description: i18n.word.weekly,
              type: Type.userMusicRankingListWeekly,
            },
            {
              label: `${ICON.playlist} ${i18n.word.userRankingList}`,
              description: i18n.word.allTime,
              type: Type.userMusicRankingListAllTime,
            },
            {
              label: `$(sign-out) ${i18n.word.signOut}`,
              type: Type.signOut,
            },
          ],
        });

        if (pick.type === Type.user) {
          input.pop();
          return (input: MultiStepInput) => pickType(input);
        }
        if (pick.type === Type.search) {
          return (input: MultiStepInput) => inputKeyword(input, 1);
        }
        if (pick.type === Type.recommend) {
          return (input: MultiStepInput) => pickRecommend(input);
        }
        if (pick.type === Type.fm) {
          commands.executeCommand("cloudmusic.personalFM");
        } else if (pick.type === Type.userMusicRankingListWeekly) {
          webview.userMusicRanking(
            "userMusicRankingListWeekly",
            `${i18n.word.userRankingList} (${i18n.word.weekly})`,
            1
          );
        } else if (pick.type === Type.userMusicRankingListAllTime) {
          webview.userMusicRanking(
            "userMusicRankingListAllTime",
            `${i18n.word.userRankingList} (${i18n.word.allTime})`,
            0
          );
        } else if (pick.type === Type.signOut) {
          commands.executeCommand("cloudmusic.signout");
        }
      }

      async function pickRecommend(input: MultiStepInput) {
        enum Type {
          dailyPlaylist,
          dailySong,
          playlist,
          song,
        }
        interface T extends QuickPickItem {
          type: Type;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.recommendation,
          step: 2,
          totalSteps: 3,
          items: [
            {
              label: `${ICON.playlist} ${i18n.sentence.label.dailyRecommendedPlaylists}`,
              type: Type.dailyPlaylist,
            },
            {
              label: `${ICON.song} ${i18n.sentence.label.dailyRecommendedSongs}`,
              type: Type.dailySong,
            },
            {
              label: `${ICON.playlist} ${i18n.sentence.label.playlistRecommendation}`,
              type: Type.playlist,
            },
            {
              label: `${ICON.song} ${i18n.sentence.label.newsongRecommendation}`,
              type: Type.song,
            },
          ],
        });
        if (pick.type === Type.dailyPlaylist) {
          const items = await apiRecommendResource();
          return (input: MultiStepInput) => pickPlaylists(input, 3, items);
        }
        if (pick.type === Type.dailySong) {
          const items = await apiRecommendSongs();
          return (input: MultiStepInput) => pickSongs(input, 3, items);
        }
        if (pick.type === Type.playlist) {
          const items = await apiPersonalized();
          return (input: MultiStepInput) => pickPlaylists(input, 3, items);
        }
        if (pick.type === Type.song) {
          const items = await apiPersonalizedNewsong();
          return (input: MultiStepInput) => pickSongs(input, 3, items);
        }
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
        workspace.fs.writeFile(
          ACCOUNT_FILE,
          Buffer.from(JSON.stringify(state))
        );
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
              label: `$(mail) ${i18n.word.email}`,
              description: i18n.sentence.label.email,
              phone: false,
            },
            {
              label: `$(rss) ${i18n.word.cellphone}`,
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
          workspace.fs.delete(ACCOUNT_FILE, {
            recursive: false,
            useTrash: false,
          });
        } catch {}
      }
    })
  );
}
