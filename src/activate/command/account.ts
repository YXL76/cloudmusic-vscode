import * as crypto from "crypto";
import { ACCOUNT_FILE, ICON, PlaylistItem } from "../../constant";
import {
  ArtistArea,
  ArtistInitial,
  ArtistType,
  MultiStepInput,
  TopSong,
  apiAlbumNewest,
  apiAlbumSublist,
  apiArtistList,
  apiArtistSublist,
  apiPersonalized,
  apiPersonalizedNewsong,
  apiPlaylistCatlist,
  apiRecommendResource,
  apiRecommendSongs,
  apiTopAlbum,
  apiTopArtists,
  apiTopPlaylist,
  apiTopPlaylistHighquality,
  apiTopSong,
  apiToplist,
  apiToplistArtist,
  pickAlbums,
  pickArtist,
  pickArtistItems,
  pickArtists,
  pickPlaylist,
  pickPlaylistItems,
  pickPlaylists,
  pickSongs,
} from "../../util";
import {
  ExtensionContext,
  QuickPickItem,
  commands,
  window,
  workspace,
} from "vscode";
import { AccountManager } from "../../manager";
import { LoggedIn } from "../../state";
import { WebView } from "../../page";
import { i18n } from "../../i18n";
import { inputKeyword } from "./search";

export function account(context: ExtensionContext): void {
  const webview = WebView.getInstance(context.extensionUri);

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.account", async () => {
      let highquality = false;
      let cat = "";
      let type: ArtistType;
      let area: ArtistArea;
      let initial: ArtistInitial;
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
          save,
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
              label: `${ICON.rankinglist} ${i18n.word.userRankingList}`,
              description: i18n.word.weekly,
              type: Type.userMusicRankingListWeekly,
            },
            {
              label: `${ICON.rankinglist} ${i18n.word.userRankingList}`,
              description: i18n.word.allTime,
              type: Type.userMusicRankingListAllTime,
            },
            {
              label: `${ICON.save} ${i18n.word.saved}`,
              type: Type.save,
            },
            {
              label: `$(sign-out) ${i18n.word.signOut}`,
              type: Type.signOut,
            },
          ],
        });

        if (pick.type === Type.user) {
          return input.pop();
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
        if (pick.type === Type.save) {
          return (input: MultiStepInput) => pickSave(input);
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
          playlist,
          highqualityPlaylist,
          artist,
          topAlbums,
          topArtists,
          topSongsZh,
          topSongsEn,
          topSongsJa,
          topSongsKr,
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
              label: `${ICON.playlist} ${i18n.word.playlist}`,
              type: Type.playlist,
            },
            {
              label: `${ICON.playlist} ${i18n.word.highqualityPlaylist}`,
              type: Type.highqualityPlaylist,
            },
            {
              label: `${ICON.artist} ${i18n.word.artist}`,
              type: Type.artist,
            },
            {
              label: `${ICON.album} ${i18n.word.topAlbums}`,
              type: Type.topAlbums,
            },
            {
              label: `${ICON.artist} ${i18n.word.topArtists}`,
              type: Type.topArtists,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.zh})`,
              type: Type.topSongsZh,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.en})`,
              type: Type.topSongsEn,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.ja})`,
              type: Type.topSongsJa,
            },
            {
              label: `${ICON.song} ${i18n.word.topSong} (${i18n.word.kr})`,
              type: Type.topSongsKr,
            },
            {
              label: `${ICON.album} ${i18n.word.albumNewest}`,
              type: Type.albumNewest,
            },
          ],
        });
        if (pick.type === Type.playlist) {
          highquality = false;
          return (input: MultiStepInput) => pickPlaylistCategories(input);
        }
        if (pick.type === Type.highqualityPlaylist) {
          highquality = true;
          return (input: MultiStepInput) => pickPlaylistCategories(input);
        }
        if (pick.type === Type.artist) {
          return (input: MultiStepInput) => pickArtistType(input);
        }
        if (pick.type === Type.topAlbums) {
          return async (input: MultiStepInput) =>
            pickAlbums(input, 3, await apiTopAlbum());
        }
        if (pick.type === Type.topArtists) {
          return async (input: MultiStepInput) =>
            pickArtists(input, 3, await apiTopArtists(50, 0));
        }
        if (pick.type === Type.topSongsZh) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.zh));
        }
        if (pick.type === Type.topSongsEn) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.en));
        }
        if (pick.type === Type.topSongsJa) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.ja));
        }
        if (pick.type === Type.topSongsKr) {
          return async (input: MultiStepInput) =>
            pickSongs(input, 3, await apiTopSong(TopSong.kr));
        }
        if (pick.type === Type.albumNewest) {
          return async (input: MultiStepInput) =>
            pickAlbums(input, 3, await apiAlbumNewest());
        }
      }

      async function pickPlaylistCategories(input: MultiStepInput) {
        const categories = await apiPlaylistCatlist();
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 3,
          totalSteps: 6,
          items: Object.keys(categories).map((label) => ({ label })),
        });
        return (input: MultiStepInput) =>
          pickPlaylistSubCategories(
            input,
            categories[pick.label].map(({ name, hot }) => ({
              label: name,
              description: hot ? "$(flame)" : undefined,
            }))
          );
      }

      async function pickPlaylistSubCategories(
        input: MultiStepInput,
        items: QuickPickItem[]
      ) {
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 4,
          totalSteps: 6,
          items,
        });
        cat = pick.label;
        return (input: MultiStepInput) => pickAllPlaylists(input, 0);
      }

      async function pickAllPlaylists(input: MultiStepInput, offset: number) {
        const limit = 50;
        const playlists = highquality
          ? await apiTopPlaylistHighquality(cat, limit, offset)
          : await apiTopPlaylist(cat, limit, offset);
        const pick = await input.showQuickPick({
          title: i18n.word.playlist,
          step: 5,
          totalSteps: 6,
          items: [
            ...(offset > 0
              ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, item: -1 }]
              : []),
            ...pickPlaylistItems(playlists),
            ...(playlists.length === limit
              ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, item: -2 }]
              : []),
          ],
        });
        if (pick.item === -1) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllPlaylists(input, offset - limit);
        }
        if (pick.item === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllPlaylists(input, offset + limit);
        }
        return (input: MultiStepInput) =>
          pickPlaylist(input, 6, pick.item as PlaylistItem);
      }

      async function pickArtistType(input: MultiStepInput) {
        interface T extends QuickPickItem {
          type: ArtistType;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.type,
          step: 3,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.male,
              type: ArtistType.male,
            },
            {
              label: i18n.word.female,
              type: ArtistType.female,
            },
            {
              label: i18n.word.band,
              type: ArtistType.band,
            },
          ],
        });
        type = pick.type;
        return async (input: MultiStepInput) => pickArtistArea(input);
      }

      async function pickArtistArea(input: MultiStepInput) {
        interface T extends QuickPickItem {
          type: ArtistArea;
        }

        const pick = await input.showQuickPick<T>({
          title: i18n.word.area,
          step: 4,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.all,
              type: ArtistArea.all,
            },
            {
              label: i18n.word.zh,
              type: ArtistArea.zh,
            },
            {
              label: i18n.word.en,
              type: ArtistArea.en,
            },
            {
              label: i18n.word.ja,
              type: ArtistArea.ja,
            },
            {
              label: i18n.word.kr,
              type: ArtistArea.kr,
            },
            {
              label: i18n.word.other,
              type: ArtistArea.other,
            },
          ],
        });
        area = pick.type;
        return async (input: MultiStepInput) => pickArtistInitial(input);
      }

      async function pickArtistInitial(input: MultiStepInput) {
        interface T extends QuickPickItem {
          type: ArtistInitial;
        }

        const allInitial: ArtistInitial[] = [
          "A",
          "B",
          "C",
          "D",
          "E",
          "F",
          "G",
          "H",
          "I",
          "J",
          "K",
          "L",
          "M",
          "N",
          "O",
          "P",
          "Q",
          "R",
          "S",
          "T",
          "U",
          "V",
          "W",
          "X",
          "Y",
          "Z",
        ];

        const pick = await input.showQuickPick<T>({
          title: i18n.word.initial,
          step: 5,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.all,
              type: undefined,
            },
            ...allInitial.map((i) => ({
              label: i as string,
              type: i,
            })),
          ],
        });
        initial = pick.type;
        return async (input: MultiStepInput) => pickAllArtist(input, 0);
      }

      async function pickAllArtist(input: MultiStepInput, offset: number) {
        const limit = 50;
        const artists = await apiArtistList(type, area, initial, limit, offset);
        const pick = await input.showQuickPick({
          title: i18n.word.artist,
          step: 6,
          totalSteps: 7,
          items: [
            ...(offset > 0
              ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
              : []),
            ...pickArtistItems(artists),
            ...(artists.length === limit
              ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
              : []),
          ],
        });
        if (pick.id === -1) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllArtist(input, offset - limit);
        }
        if (pick.id === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllArtist(input, offset + limit);
        }
        return (input: MultiStepInput) => pickArtist(input, 7, pick.id);
      }

      async function pickSave(input: MultiStepInput) {
        enum Type {
          album,
          artist,
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
              label: `${ICON.album} ${i18n.word.album}`,
              type: Type.album,
            },
            {
              label: `${ICON.artist} ${i18n.word.artist}`,
              type: Type.artist,
            },
          ],
        });
        if (pick.type === Type.album) {
          return async (input: MultiStepInput) =>
            pickAlbums(input, 3, await apiAlbumSublist());
        }
        if (pick.type === Type.artist) {
          return async (input: MultiStepInput) =>
            pickArtists(input, 3, await apiArtistSublist());
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
