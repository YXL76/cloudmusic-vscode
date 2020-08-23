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
  TopSong,
  apiAlbumNewest,
  apiPersonalized,
  apiPersonalizedNewsong,
  apiRecommendResource,
  apiRecommendSongs,
  apiTopAlbum,
  apiTopSong,
  apiToplist,
  apiToplistArtist,
  pickAlbums,
  pickArtists,
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
          toplist,
          explore,
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
              label: `$(rocket) ${i18n.word.toplist}`,
              type: Type.toplist,
            },
            {
              label: `$(telescope) ${i18n.word.explore}`,
              type: Type.explore,
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
        if (pick.type === Type.toplist) {
          return (input: MultiStepInput) => pickToplist(input);
        }
        if (pick.type === Type.explore) {
          return (input: MultiStepInput) => pickExplore(input);
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
          return async (input: MultiStepInput) =>
            pickPlaylists(input, 3, await apiRecommendResource());
        }
        if (pick.type === Type.dailySong) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiRecommendSongs());
        }
        if (pick.type === Type.playlist) {
          return async (input: MultiStepInput) =>
            pickPlaylists(input, 3, await apiPersonalized());
        }
        if (pick.type === Type.song) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiPersonalizedNewsong());
        }
      }

      async function pickToplist(input: MultiStepInput) {
        enum Type {
          song,
          artist,
        }
        interface T extends QuickPickItem {
          type: Type;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.toplist,
          step: 2,
          totalSteps: 3,
          items: [
            {
              label: `${ICON.song} ${i18n.word.songList}`,
              type: Type.song,
            },
            {
              label: `${ICON.artist} ${i18n.word.artistList}`,
              type: Type.artist,
            },
          ],
        });
        if (pick.type === Type.song) {
          return async (input: MultiStepInput) =>
            pickPlaylists(input, 3, await apiToplist());
        }
        if (pick.type === Type.artist) {
          return async (input: MultiStepInput) =>
            pickArtists(input, 3, await apiToplistArtist());
        }
      }

      async function pickExplore(input: MultiStepInput) {
        enum Type {
          topAlbum,
          topSongZh,
          topSongEn,
          topSongJa,
          topSongKr,
          albumNewest,
        }
        interface T extends QuickPickItem {
          type: Type;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.explore,
          step: 2,
          totalSteps: 3,
          items: [
            {
              label: `${ICON.album} ${i18n.word.topAlbum}`,
              type: Type.topAlbum,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.zh})`,
              type: Type.topSongZh,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.en})`,
              type: Type.topSongEn,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.ja})`,
              type: Type.topSongJa,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.kr})`,
              type: Type.topSongKr,
            },
            {
              label: `${ICON.album} ${i18n.word.albumNewest}`,
              type: Type.albumNewest,
            },
          ],
        });
        if (pick.type === Type.topAlbum) {
          return async (input: MultiStepInput) =>
            pickAlbums(input, 3, await apiTopAlbum());
        }
        if (pick.type === Type.topSongZh) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.zh));
        }
        if (pick.type === Type.topSongEn) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.en));
        }
        if (pick.type === Type.topSongJa) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.ja));
        }
        if (pick.type === Type.topSongKr) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.kr));
        }
        if (pick.type === Type.albumNewest) {
          return async (input: MultiStepInput) =>
            pickAlbums(input, 3, await apiAlbumNewest());
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
              label: `$(device-mobile) ${i18n.word.cellphone}`,
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
