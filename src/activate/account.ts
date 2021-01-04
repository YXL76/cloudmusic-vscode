import { ACCOUNT_KEY, AUTO_CHECK, COOKIE_KEY, ICON } from "../constant";
import {
  ArtistArea,
  ArtistType,
  TopSongType,
  apiAlbumNewest,
  apiAlbumSublist,
  apiArtistList,
  apiArtistSublist,
  apiDailySignin,
  apiHighqualityTags,
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
  apiUserLevel,
  base,
} from "../api";
import {
  ButtonAction,
  MultiStepInput,
  WebView,
  pickAlbums,
  pickArtist,
  pickArtistItems,
  pickArtists,
  pickPlaylist,
  pickPlaylistItems,
  pickPlaylists,
  pickSongs,
  pickUser,
} from "../util";
import type { ExtensionContext, QuickPickItem } from "vscode";
import { commands, window } from "vscode";
import type { Account } from "../constant";
import { AccountManager } from "../manager";
import type { ArtistInitial } from "../api";
import type { InputStep } from "../util";
import { LoggedIn } from "../state";
import { createHash } from "crypto";
import { i18n } from "../i18n";
import { inputKeyword } from ".";

export function initAccount(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.account", async () => {
      if (!LoggedIn.get()) {
        const result = await window.showErrorMessage(
          i18n.sentence.error.needSignIn,
          i18n.word.signIn
        );
        if (result === i18n.word.signIn) {
          void commands.executeCommand("cloudmusic.signin");
        }
        return;
      }
      let cat = "";
      let type: ArtistType;
      let area: ArtistArea;
      let initial: ArtistInitial;
      void MultiStepInput.run((input) => pickType(input));

      async function pickType(input: MultiStepInput) {
        const enum Type {
          user,
          level,
          fm,
          search,
          recommendation,
          toplist,
          explore,
          userMusicRankingList,
          save,
          signOut,
        }

        const level = await apiUserLevel();

        const pick = await input.showQuickPick({
          title: i18n.word.account,
          step: 1,
          totalSteps: 1,
          items: [
            {
              label: `${ICON.artist} ${AccountManager.nickname}`,
              type: Type.user,
            },
            {
              label: `${ICON.level} Lv.${level.level}`,
              description: `${Math.floor(level.progress * 100)}%`,
              type: Type.level,
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
              type: Type.recommendation,
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
              type: Type.userMusicRankingList,
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

        switch (pick.type) {
          case Type.user:
            return (input: MultiStepInput) =>
              pickUser(input, 2, AccountManager.uid);
          case Type.level:
            return input.pop();
          case Type.search:
            return (input: MultiStepInput) => inputKeyword(input, 1);
          case Type.recommendation:
            return (input: MultiStepInput) => pickRecommend(input);
          case Type.toplist:
            return (input: MultiStepInput) => pickToplist(input);
          case Type.explore:
            return (input: MultiStepInput) => pickExplore(input);
          case Type.save:
            return (input: MultiStepInput) => pickSave(input);
          case Type.fm:
            void commands.executeCommand("cloudmusic.personalFM");
            break;
          case Type.userMusicRankingList:
            WebView.getInstance().userMusicRankingList();
            break;
          case Type.signOut:
            void commands.executeCommand("cloudmusic.signout");
            break;
        }
        return;
      }

      async function pickRecommend(input: MultiStepInput) {
        const enum Type {
          dailyPlaylist,
          dailySong,
          playlist,
          song,
        }

        const pick = await input.showQuickPick({
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
        switch (pick.type) {
          case Type.dailyPlaylist:
            return async (input: MultiStepInput) =>
              pickPlaylists(input, 3, await apiRecommendResource());
          case Type.dailySong:
            return async (input: MultiStepInput) =>
              pickSongs(input, 3, await apiRecommendSongs());
          case Type.playlist:
            return async (input: MultiStepInput) =>
              pickPlaylists(input, 3, await apiPersonalized());
          case Type.song:
            return async (input: MultiStepInput) =>
              pickSongs(input, 3, await apiPersonalizedNewsong());
        }
      }

      async function pickToplist(input: MultiStepInput) {
        const enum Type {
          song,
          artist,
        }

        const pick = await input.showQuickPick({
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
        switch (pick.type) {
          case Type.song:
            return async (input: MultiStepInput) =>
              pickPlaylists(input, 3, await apiToplist());
          case Type.artist:
            return async (input: MultiStepInput) =>
              pickArtists(input, 3, await apiToplistArtist());
        }
      }

      async function pickExplore(input: MultiStepInput) {
        const enum Type {
          playlist,
          highqualityPlaylist,
          artist,
          topAlbums,
          topArtists,
          topSongs,
          albumNewest,
        }
        const pick = await input.showQuickPick({
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
              label: `${ICON.song} ${i18n.word.topSong}`,
              type: Type.topSongs,
            },
            {
              label: `${ICON.album} ${i18n.word.albumNewest}`,
              type: Type.albumNewest,
            },
          ],
        });
        switch (pick.type) {
          case Type.playlist:
            return (input: MultiStepInput) => pickPlaylistCategories(input);
          case Type.highqualityPlaylist:
            return (input: MultiStepInput) =>
              pickHighqualitPlaylistCategories(input);
          case Type.artist:
            return (input: MultiStepInput) => pickArtistType(input);
          case Type.topAlbums:
            return async (input: MultiStepInput) =>
              pickAlbums(input, 3, await apiTopAlbum());
          case Type.topArtists:
            return async (input: MultiStepInput) =>
              pickArtists(input, 3, await apiTopArtists(50, 0));
          case Type.topSongs:
            return (input: MultiStepInput) => pickTopSongs(input);
          case Type.albumNewest:
            return async (input: MultiStepInput) =>
              pickAlbums(input, 3, await apiAlbumNewest());
        }
      }

      async function pickTopSongs(input: MultiStepInput) {
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 3,
          totalSteps: 4,
          items: [
            {
              label: i18n.word.zh,
              type: TopSongType.zh,
            },
            {
              label: i18n.word.en,
              type: TopSongType.ea,
            },
            {
              label: i18n.word.ja,
              type: TopSongType.ja,
            },
            {
              label: i18n.word.kr,
              type: TopSongType.kr,
            },
          ],
        });
        return async (input: MultiStepInput) =>
          pickSongs(input, 4, await apiTopSong(pick.type));
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

      async function pickHighqualitPlaylistCategories(input: MultiStepInput) {
        const categories = await apiHighqualityTags();
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 3,
          totalSteps: 5,
          items: categories.map(({ name, hot }) => ({
            label: name,
            description: hot ? "$(flame)" : undefined,
          })),
        });
        cat = pick.label;
        return (input: MultiStepInput) => pickAllHighqualityPlaylists(input);
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

      async function pickAllPlaylists(
        input: MultiStepInput,
        offset: number
      ): Promise<InputStep> {
        const limit = 50;
        const playlists = await apiTopPlaylist(cat, limit, offset);
        const pick = await input.showQuickPick(
          {
            title: i18n.word.playlist,
            step: 5,
            totalSteps: 6,
            items: pickPlaylistItems(playlists),
          },
          undefined,
          {
            previous: offset > 0,
            next: playlists.length === limit,
          }
        );
        if (pick === ButtonAction.previous) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllPlaylists(input, offset - limit);
        }
        if (pick === ButtonAction.next) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllPlaylists(input, offset + limit);
        }
        return (input: MultiStepInput) => pickPlaylist(input, 6, pick.item);
      }

      async function pickAllHighqualityPlaylists(
        input: MultiStepInput
      ): Promise<InputStep> {
        const limit = 50;
        const playlists = await apiTopPlaylistHighquality(cat, limit);
        const pick = await input.showQuickPick({
          title: i18n.word.playlist,
          step: 4,
          totalSteps: 5,
          items: pickPlaylistItems(playlists),
        });
        return (input: MultiStepInput) => pickPlaylist(input, 5, pick.item);
      }

      async function pickArtistType(input: MultiStepInput) {
        const pick = await input.showQuickPick({
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
        const pick = await input.showQuickPick({
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
              type: ArtistArea.ea,
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

        const pick = await input.showQuickPick({
          title: i18n.word.initial,
          step: 5,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.all,
              type: "" as const,
            },
            ...allInitial.map((i) => ({
              label: i as string,
              type: i,
            })),
          ],
        });
        initial = pick.type;
        return (input: MultiStepInput) => pickAllArtist(input, 0);
      }

      async function pickAllArtist(
        input: MultiStepInput,
        offset: number
      ): Promise<InputStep> {
        const limit = 50;
        const artists = await apiArtistList(type, area, initial, limit, offset);
        const pick = await input.showQuickPick(
          {
            title: i18n.word.artist,
            step: 6,
            totalSteps: 7,
            items: pickArtistItems(artists),
          },
          undefined,
          {
            previous: offset > 0,
            next: artists.length === limit,
          }
        );
        if (pick === ButtonAction.previous) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllArtist(input, offset - limit);
        }
        if (pick === ButtonAction.next) {
          input.pop();
          return (input: MultiStepInput) =>
            pickAllArtist(input, offset + limit);
        }
        return (input: MultiStepInput) => pickArtist(input, 7, pick.id);
      }

      async function pickSave(input: MultiStepInput) {
        const enum Type {
          album,
          artist,
        }

        const pick = await input.showQuickPick({
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
        switch (pick.type) {
          case Type.album:
            return async (input: MultiStepInput) =>
              pickAlbums(input, 3, await apiAlbumSublist());
          case Type.artist:
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
      let totalSteps = 3;

      const state: Account = {
        phone: "",
        username: "",
        password: "",
        countrycode: "86",
      };
      await MultiStepInput.run((input) => pickMethod(input));

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
        if (pick.phone) {
          totalSteps = 4;
          return (input: MultiStepInput) => inputCountrycode(input);
        }
        totalSteps = 3;
        return (input: MultiStepInput) => inputUsername(input);
      }

      async function inputCountrycode(input: MultiStepInput) {
        state.countrycode = await input.showInputBox({
          title,
          step: 2,
          totalSteps,
          value: state.countrycode,
          prompt: i18n.sentence.hint.countrycode,
        });
        return (input: MultiStepInput) => inputPhone(input);
      }

      async function inputPhone(input: MultiStepInput) {
        state.phone = await input.showInputBox({
          title,
          step: totalSteps - 1,
          totalSteps,
          value: state.phone,
          prompt: i18n.sentence.hint.account,
        });
        state.username = "";
        return (input: MultiStepInput) => inputPassword(input);
      }

      async function inputUsername(input: MultiStepInput) {
        state.username = await input.showInputBox({
          title,
          step: totalSteps - 1,
          totalSteps,
          value: state.username,
          prompt: i18n.sentence.hint.account,
        });
        state.phone = "";
        return (input: MultiStepInput) => inputPassword(input);
      }

      async function inputPassword(input: MultiStepInput) {
        const password = await input.showInputBox({
          title,
          step: totalSteps,
          totalSteps,
          prompt: i18n.sentence.hint.password,
          password: true,
        });

        state.password = createHash("md5").update(password).digest("hex");

        if (await AccountManager.login(state)) {
          void window.showInformationMessage(i18n.sentence.success.signIn);
        } else {
          void window.showErrorMessage(i18n.sentence.fail.signIn);
        }
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.dailyCheck", async () => {
      if (LoggedIn.get()) {
        if (await apiDailySignin()) {
          void window.showInformationMessage(i18n.sentence.success.dailyCheck);
        }
      } else {
        void window.showErrorMessage(i18n.sentence.error.needSignIn);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.signout", () => {
      void AccountManager.logout();
    })
  );

  void (async () => {
    base.cookie = context.globalState.get(COOKIE_KEY) || {};
    if (await AccountManager.login(context.globalState.get(ACCOUNT_KEY))) {
      if (AUTO_CHECK) {
        void commands.executeCommand("cloudmusic.dailyCheck");
      }
      return;
    }
    if (
      (await window.showInformationMessage(
        i18n.sentence.hint.trySignIn,
        i18n.word.signIn
      )) === i18n.word.signIn
    ) {
      void commands.executeCommand("cloudmusic.signin");
    }
  })().catch();
}
