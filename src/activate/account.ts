import { AUTH_PROVIDER_ID, ICON } from "../constant";
import {
  ArtistArea,
  ArtistType,
  TopSongType,
  apiAlbumNewest,
  apiAlbumSublist,
  apiArtistList,
  apiArtistSublist,
  apiDjCatelist,
  apiDjHot,
  apiDjProgramToplist,
  apiDjProgramToplistHours,
  apiDjRadioHot,
  apiDjRecommend,
  apiDjRecommendType,
  apiDjToplist,
  apiHighqualityTags,
  apiPersonalized,
  apiPersonalizedDjprogram,
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
} from "../api";
import {
  ButtonAction,
  MultiStepInput,
  State,
  pickAlbums,
  pickArtist,
  pickArtistItems,
  pickArtists,
  pickPlaylist,
  pickPlaylistItems,
  pickPlaylists,
  pickPrograms,
  pickRadios,
  pickSongs,
  pickUser,
} from "../util";
import type { ExtensionContext, QuickPickItem } from "vscode";
import { authentication, commands, window } from "vscode";
import { AccountManager } from "../manager";
import type { ArtistInitial } from "../api";
import type { InputStep } from "../util";
import type { RadioDetail } from "../constant";
import { Webview } from "../webview";
import i18n from "../i18n";
import { inputKeyword } from ".";

export function initAccount(context: ExtensionContext): void {
  const accountManager = AccountManager.getInstance();
  authentication.registerAuthenticationProvider(
    AUTH_PROVIDER_ID,
    "Cloudmusic",
    accountManager
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.account", () => {
      if (!State.login) {
        void window.showErrorMessage(i18n.sentence.error.needSignIn);
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
          musicRanking,
          save,
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
              label: `${ICON.rankinglist} ${i18n.word.musicRanking}`,
              type: Type.musicRanking,
            },
            {
              label: `${ICON.save} ${i18n.word.saved}`,
              type: Type.save,
            },
          ],
        });

        switch (pick.type) {
          case Type.user:
            return (input: MultiStepInput) =>
              pickUser(input, 2, AccountManager.uid);
          case Type.search:
            return (input: MultiStepInput) => inputKeyword(input);
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
          case Type.musicRanking:
            await Webview.musicRanking();
            return;
        }
        return input.stay();
      }

      async function pickRecommend(input: MultiStepInput) {
        const enum Type {
          dailyPlaylist,
          dailySong,
          playlist,
          song,
          radio,
          program,
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
            {
              label: `${ICON.radio} ${i18n.sentence.label.radioRecommendation}`,
              type: Type.radio,
            },
            {
              label: `${ICON.program} ${i18n.sentence.label.programRecommendation}`,
              type: Type.program,
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
          case Type.radio:
            return async (input: MultiStepInput) =>
              pickRadioType(input, 3, apiDjRecommend, apiDjRecommendType);
          case Type.program:
            return async (input: MultiStepInput) =>
              pickPrograms(input, 3, await apiPersonalizedDjprogram());
        }
      }

      async function pickRadioType(
        input: MultiStepInput,
        step: number,
        allFunc: (...args: number[]) => Promise<RadioDetail[]>,
        typeFunc: (id: number, ...args: number[]) => Promise<RadioDetail[]>
      ) {
        const types = await apiDjCatelist();
        const pick = await input.showQuickPick({
          title: i18n.word.type,
          step,
          totalSteps: step + 1,
          items: [
            { label: i18n.word.all, id: -1 },
            ...types.map(({ name, id }) => ({ label: name, id })),
          ],
        });
        if (pick.id === -1)
          return async (input: MultiStepInput) =>
            pickRadios(input, 3, await allFunc(100, 0));
        return async (input: MultiStepInput) =>
          pickRadios(input, 3, await typeFunc(pick.id, 100, 0));
      }

      async function pickToplist(input: MultiStepInput) {
        const enum Type {
          song,
          artist,
          radioNew,
          radioHot,
          program,
          program24,
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
            {
              label: `${ICON.radio} ${i18n.word.radio} (${i18n.word.new})`,
              type: Type.radioNew,
            },
            {
              label: `${ICON.radio} ${i18n.word.radio} (${i18n.word.hot})`,
              type: Type.radioHot,
            },
            {
              label: `${ICON.program} ${i18n.word.program}`,
              type: Type.program,
            },
            {
              label: `${ICON.program} ${i18n.word.program} (${i18n.word.today})`,
              type: Type.program24,
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
          case Type.radioNew:
            return async (input: MultiStepInput) =>
              pickRadios(input, 3, await apiDjToplist(0, 100, 0));
          case Type.radioHot:
            return async (input: MultiStepInput) =>
              pickRadios(input, 3, await apiDjToplist(1, 100, 0));
          case Type.program:
            return async (input: MultiStepInput) =>
              pickPrograms(input, 3, await apiDjProgramToplist(100, 0));
          case Type.program24:
            return async (input: MultiStepInput) =>
              pickPrograms(input, 3, await apiDjProgramToplistHours());
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
          radioHot,
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
            {
              label: `${ICON.radio} ${i18n.word.radioHot}`,
              type: Type.radioHot,
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
          case Type.radioHot:
            return async (input: MultiStepInput) =>
              pickRadioType(input, 3, apiDjHot, apiDjRadioHot);
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
              description: hot ? ICON.hot : undefined,
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
            description: hot ? ICON.hot : undefined,
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
        if (pick === ButtonAction.previous)
          return input.stay((input: MultiStepInput) =>
            pickAllPlaylists(input, offset - limit)
          );
        if (pick === ButtonAction.next)
          return input.stay((input: MultiStepInput) =>
            pickAllPlaylists(input, offset + limit)
          );
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
        if (pick === ButtonAction.previous)
          return input.stay((input: MultiStepInput) =>
            pickAllArtist(input, offset - limit)
          );
        if (pick === ButtonAction.next)
          return input.stay((input: MultiStepInput) =>
            pickAllArtist(input, offset + limit)
          );
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
    commands.registerCommand("cloudmusic.dailyCheck", async () => {
      if (State.login)
        if (await AccountManager.dailyCheck())
          void window.showInformationMessage(i18n.sentence.success.dailyCheck);
        else void window.showErrorMessage(i18n.sentence.error.needSignIn);
    })
  );
}
