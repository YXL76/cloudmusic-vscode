import { AUTH_PROVIDER_ID, ICON } from "../constant";
import {
  ButtonAction,
  IPC,
  MultiStepInput,
  State,
  Webview,
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
} from "../utils";
import type { ExtensionContext, QuickPickItem } from "vscode";
import { authentication, commands, window } from "vscode";
import { AccountManager } from "../manager";
import type { InputStep } from "../utils";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import i18n from "../i18n";
import { inputKeyword } from ".";

export async function initAccount(context: ExtensionContext): Promise<void> {
  const accountManager = await AccountManager.getInstance();

  context.subscriptions.push(
    authentication.registerAuthenticationProvider(
      AUTH_PROVIDER_ID,
      "Cloudmusic",
      accountManager
    ),

    commands.registerCommand("cloudmusic.account", () => {
      if (!State.login) {
        void window.showErrorMessage(i18n.sentence.error.needSignIn);
        return;
      }
      let cat = "";
      let type: NeteaseEnum.ArtistType;
      let area: NeteaseEnum.ArtistArea;
      let initial: NeteaseTypings.ArtistInitial;
      void MultiStepInput.run((input) => pickType(input));

      async function pickType(input: MultiStepInput): Promise<InputStep> {
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

        const level = await IPC.netease("userLevel", []);

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
            return (input) => pickUser(input, 2, AccountManager.uid);
          case Type.search:
            return (input) => inputKeyword(input);
          case Type.recommendation:
            return (input) => pickRecommend(input);
          case Type.toplist:
            return (input) => pickToplist(input);
          case Type.explore:
            return (input) => pickExplore(input);
          case Type.save:
            return (input) => pickSave(input);
          case Type.fm:
            void commands.executeCommand("cloudmusic.personalFM");
            break;
          case Type.musicRanking:
            await Webview.musicRanking();
        }
        return input.stay();
      }

      async function pickRecommend(input: MultiStepInput): Promise<InputStep> {
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
            return async (input) =>
              pickPlaylists(
                input,
                3,
                await IPC.netease("recommendResource", [])
              );
          case Type.dailySong:
            return async (input) =>
              pickSongs(input, 3, await IPC.netease("recommendSongs", []));
          case Type.playlist:
            return async (input) =>
              pickPlaylists(input, 3, await IPC.netease("personalized", []));
          case Type.song:
            return async (input) =>
              pickSongs(input, 3, await IPC.netease("personalizedNewsong", []));
          case Type.radio:
            return async (input) =>
              pickRadioType(
                input,
                3,
                () => IPC.netease("djRecommend", []),
                (cateId) => IPC.netease("djRecommendType", [cateId])
              );
          case Type.program:
            return async (input) =>
              pickPrograms(
                input,
                3,
                await IPC.netease("personalizedDjprogram", [])
              );
        }
      }

      async function pickRadioType(
        input: MultiStepInput,
        step: number,
        allFunc: (
          ...args: readonly number[]
        ) => Promise<readonly NeteaseTypings.RadioDetail[]>,
        typeFunc: (
          id: number,
          ...args: readonly number[]
        ) => Promise<readonly NeteaseTypings.RadioDetail[]>
      ): Promise<InputStep> {
        const types = await IPC.netease("djCatelist", []);
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
          return async (input) => pickRadios(input, 3, await allFunc(100, 0));
        return async (input) =>
          pickRadios(input, 3, await typeFunc(pick.id, 100, 0));
      }

      async function pickToplist(input: MultiStepInput): Promise<InputStep> {
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
            return async (input) =>
              pickPlaylists(input, 3, await IPC.netease("toplist", []));
          case Type.artist:
            return async (input) =>
              pickArtists(input, 3, await IPC.netease("toplistArtist", []));
          case Type.radioNew:
            return async (input) =>
              pickRadios(input, 3, await IPC.netease("djToplist", [0, 100, 0]));
          case Type.radioHot:
            return async (input) =>
              pickRadios(input, 3, await IPC.netease("djToplist", [1, 100, 0]));
          case Type.program:
            return async (input) =>
              pickPrograms(
                input,
                3,
                await IPC.netease("djProgramToplist", [100, 0])
              );
          case Type.program24:
            return async (input) =>
              pickPrograms(
                input,
                3,
                await IPC.netease("djProgramToplistHours", [])
              );
        }
      }

      async function pickExplore(input: MultiStepInput): Promise<InputStep> {
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
            return (input) => pickPlaylistCategories(input);
          case Type.highqualityPlaylist:
            return (input) => pickHighqualitPlaylistCategories(input);
          case Type.artist:
            return (input) => pickArtistType(input);
          case Type.topAlbums:
            return async (input) =>
              pickAlbums(input, 3, await IPC.netease("topAlbum", []));
          case Type.topArtists:
            return async (input) =>
              pickArtists(input, 3, await IPC.netease("topArtists", [50, 0]));
          case Type.topSongs:
            return (input) => pickTopSongs(input);
          case Type.albumNewest:
            return async (input) =>
              pickAlbums(input, 3, await IPC.netease("albumNewest", []));
          case Type.radioHot:
            return async (input) =>
              pickRadioType(
                input,
                3,
                (limit, offset) => IPC.netease("djHot", [limit, offset]),
                (cateId, limit, offset) =>
                  IPC.netease("djRadioHot", [cateId, limit, offset])
              );
        }
      }

      async function pickTopSongs(input: MultiStepInput): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 3,
          totalSteps: 4,
          items: [
            {
              label: i18n.word.zh,
              type: NeteaseEnum.TopSongType.zh,
            },
            {
              label: i18n.word.en,
              type: NeteaseEnum.TopSongType.ea,
            },
            {
              label: i18n.word.ja,
              type: NeteaseEnum.TopSongType.ja,
            },
            {
              label: i18n.word.kr,
              type: NeteaseEnum.TopSongType.kr,
            },
          ],
        });
        return async (input) =>
          pickSongs(input, 4, await IPC.netease("topSong", [pick.type]));
      }

      async function pickPlaylistCategories(
        input: MultiStepInput
      ): Promise<InputStep> {
        const categories = await IPC.netease("playlistCatlist", []);
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 3,
          totalSteps: 6,
          items: Object.keys(categories).map((label) => ({ label })),
        });
        return (input) =>
          pickPlaylistSubCategories(
            input,
            categories[pick.label].map(({ name, hot }) => ({
              label: name,
              description: hot ? ICON.hot : undefined,
            }))
          );
      }

      async function pickHighqualitPlaylistCategories(
        input: MultiStepInput
      ): Promise<InputStep> {
        const categories = await IPC.netease("highqualityTags", []);
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
        return (input) => pickAllHighqualityPlaylists(input);
      }

      async function pickPlaylistSubCategories(
        input: MultiStepInput,
        items: readonly QuickPickItem[]
      ): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title: i18n.word.categorie,
          step: 4,
          totalSteps: 6,
          items,
        });
        cat = pick.label;
        return (input) => pickAllPlaylists(input, 0);
      }

      async function pickAllPlaylists(
        input: MultiStepInput,
        offset: number
      ): Promise<InputStep> {
        const limit = 50;
        const playlists = await IPC.netease("topPlaylist", [
          cat,
          limit,
          offset,
        ]);
        const pick = await input.showQuickPick({
          title: i18n.word.playlist,
          step: 5,
          totalSteps: 6,
          items: pickPlaylistItems(playlists),
          previous: offset > 0,
          next: playlists.length === limit,
        });
        if (pick === ButtonAction.previous)
          return input.stay((input) => pickAllPlaylists(input, offset - limit));
        if (pick === ButtonAction.next)
          return input.stay((input) => pickAllPlaylists(input, offset + limit));
        return (input) => pickPlaylist(input, 6, pick.item);
      }

      async function pickAllHighqualityPlaylists(
        input: MultiStepInput
      ): Promise<InputStep> {
        const limit = 50;
        const playlists = await IPC.netease("topPlaylistHighquality", [
          cat,
          limit,
        ]);
        const pick = await input.showQuickPick({
          title: i18n.word.playlist,
          step: 4,
          totalSteps: 5,
          items: pickPlaylistItems(playlists),
        });
        return (input) => pickPlaylist(input, 5, pick.item);
      }

      async function pickArtistType(input: MultiStepInput): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title: i18n.word.type,
          step: 3,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.male,
              type: NeteaseEnum.ArtistType.male,
            },
            {
              label: i18n.word.female,
              type: NeteaseEnum.ArtistType.female,
            },
            {
              label: i18n.word.band,
              type: NeteaseEnum.ArtistType.band,
            },
          ],
        });
        type = pick.type;
        return async (input) => pickArtistArea(input);
      }

      async function pickArtistArea(input: MultiStepInput): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title: i18n.word.area,
          step: 4,
          totalSteps: 7,
          items: [
            {
              label: i18n.word.all,
              type: NeteaseEnum.ArtistArea.all,
            },
            {
              label: i18n.word.zh,
              type: NeteaseEnum.ArtistArea.zh,
            },
            {
              label: i18n.word.en,
              type: NeteaseEnum.ArtistArea.ea,
            },
            {
              label: i18n.word.ja,
              type: NeteaseEnum.ArtistArea.ja,
            },
            {
              label: i18n.word.kr,
              type: NeteaseEnum.ArtistArea.kr,
            },
            {
              label: i18n.word.other,
              type: NeteaseEnum.ArtistArea.other,
            },
          ],
        });
        area = pick.type;
        return async (input) => pickArtistInitial(input);
      }

      async function pickArtistInitial(
        input: MultiStepInput
      ): Promise<InputStep> {
        const allInitial: readonly NeteaseTypings.ArtistInitial[] = [
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
        return (input) => pickAllArtist(input, 0);
      }

      async function pickAllArtist(
        input: MultiStepInput,
        offset: number
      ): Promise<InputStep> {
        const limit = 50;
        const artists = await IPC.netease("artistList", [
          type,
          area,
          initial,
          limit,
          offset,
        ]);
        const pick = await input.showQuickPick({
          title: i18n.word.artist,
          step: 6,
          totalSteps: 7,
          items: pickArtistItems(artists),
          previous: offset > 0,
          next: artists.length === limit,
        });
        if (pick === ButtonAction.previous)
          return input.stay((input) => pickAllArtist(input, offset - limit));
        if (pick === ButtonAction.next)
          return input.stay((input) => pickAllArtist(input, offset + limit));
        return (input) => pickArtist(input, 7, pick.id);
      }

      async function pickSave(input: MultiStepInput): Promise<InputStep> {
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
            return async (input) =>
              pickAlbums(input, 3, await IPC.netease("albumSublist", []));
          case Type.artist:
            return async (input) =>
              pickArtists(input, 3, await IPC.netease("artistSublist", []));
        }
      }
    }),

    commands.registerCommand("cloudmusic.dailyCheck", async () => {
      if (State.login)
        if (await IPC.netease("dailyCheck", []))
          void window.showInformationMessage(i18n.sentence.success.dailyCheck);
        else void window.showErrorMessage(i18n.sentence.error.needSignIn);
    })
  );

  if (!State.login)
    try {
      await authentication.getSession(AUTH_PROVIDER_ID, [], {
        createIfNone: true,
      });
    } catch {
      void authentication.getSession(AUTH_PROVIDER_ID, []);
    }
}
