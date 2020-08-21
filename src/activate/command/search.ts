import { ExtensionContext, commands } from "vscode";
import {
  MultiStepInput,
  SearchType,
  apiSearchAlbum,
  apiSearchArtist,
  apiSearchHotDetail,
  apiSearchPlaylist,
  apiSearchSingle,
  apiSearchSuggest,
  pickAlbum,
  pickAlbumItems,
  pickArtist,
  pickArtistItems,
  pickPlaylist,
  pickPlaylistItems,
  pickSong,
  pickSongItems,
} from "../../util";
import { PlaylistItem } from "../../constant";
import { i18n } from "../../i18n";
import { throttle } from "lodash";

export function search(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.search", async () => {
      const hotItems = (await apiSearchHotDetail()).map(
        ({ searchWord, content }) => ({
          label: searchWord,
          detail: content,
        })
      );

      const title = i18n.word.search;
      const totalSteps = 3;
      const limit = 30;

      type State = {
        keyword: string;
        type: SearchType;
      };

      const updateSuggestions = throttle((that, value) => {
        that.enabled = false;
        that.busy = true;
        apiSearchSuggest(value).then((suggestions) => {
          that.items = [that.items[0]].concat(
            suggestions.map((label) => ({ label }))
          );
          that.enabled = true;
          that.busy = false;
        });
      }, 256);

      const state = {} as State;
      await MultiStepInput.run((input) => inputKeyword(input));

      async function inputKeyword(input: MultiStepInput) {
        const pick = await input.showQuickPick({
          title,
          step: 1,
          totalSteps,
          items: state.keyword
            ? [{ label: state.keyword }].concat(hotItems)
            : hotItems,
          placeholder: i18n.sentence.hint.keyword,
          changeCallback: (that, value) => {
            if (value) {
              that.items = [{ label: value }].concat(that.items.slice(1));
              updateSuggestions(that, value);
            } else {
              that.items = hotItems;
            }
          },
        });
        state.keyword = pick.label;
        return (input: MultiStepInput) => pickType(input);
      }

      async function pickType(input: MultiStepInput) {
        const pick = await input.showQuickPick({
          title,
          step: 2,
          totalSteps,
          items: [
            {
              label: `$(link) ${i18n.word.single}`,
              type: SearchType.single,
            },
            {
              label: `$(circuit-board) ${i18n.word.album}`,
              type: SearchType.album,
            },
            {
              label: `$(account) ${i18n.word.artist}`,
              type: SearchType.artist,
            },
            {
              label: `$(list-unordered) ${i18n.word.playlist}`,
              type: SearchType.playlist,
            },
          ],
          placeholder: i18n.sentence.hint.search,
        });
        state.type = pick.type;
        if (state.type === SearchType.single) {
          return (input: MultiStepInput) => pickSearchSingle(input, 0);
        }
        if (state.type === SearchType.album) {
          return (input: MultiStepInput) => pickSearchAlbum(input, 0);
        }
        if (state.type === SearchType.artist) {
          return (input: MultiStepInput) => pickSearchArtist(input, 0);
        }
        if (state.type === SearchType.playlist) {
          return (input: MultiStepInput) => pickSearchPlaylist(input, 0);
        }
        return (input: MultiStepInput) => pickSearchSingle(input, 0);
      }

      async function pickSearchSingle(input: MultiStepInput, offset: number) {
        const songs = await apiSearchSingle(state.keyword, limit, offset);
        const pick = await input.showQuickPick({
          title,
          step: 3,
          totalSteps,
          items: [
            ...(offset > 0
              ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
              : []),
            ...pickSongItems(songs),
            ...(songs.length === limit
              ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
              : []),
          ],
        });
        if (pick.id === -1) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchSingle(input, offset - limit);
        }
        if (pick.id === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchSingle(input, offset + limit);
        }
        return (input: MultiStepInput) => pickSong(input, 4, pick.id);
      }

      async function pickSearchAlbum(input: MultiStepInput, offset: number) {
        const albums = await apiSearchAlbum(state.keyword, limit, offset);
        const pick = await input.showQuickPick({
          title,
          step: 3,
          totalSteps,
          items: [
            ...(offset > 0
              ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
              : []),
            ...pickAlbumItems(albums),
            ...(albums.length === limit
              ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
              : []),
          ],
        });
        if (pick.id === -1) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchAlbum(input, offset - limit);
        }
        if (pick.id === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchAlbum(input, offset + limit);
        }
        return (input: MultiStepInput) => pickAlbum(input, 4, pick.id);
      }

      async function pickSearchArtist(input: MultiStepInput, offset: number) {
        const artists = await apiSearchArtist(state.keyword, limit, offset);
        const pick = await input.showQuickPick({
          title,
          step: 3,
          totalSteps,
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
            pickSearchArtist(input, offset - limit);
        }
        if (pick.id === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchArtist(input, offset + limit);
        }
        return (input: MultiStepInput) => pickArtist(input, 4, pick.id);
      }

      async function pickSearchPlaylist(input: MultiStepInput, offset: number) {
        const playlists = await apiSearchPlaylist(state.keyword, limit, offset);
        const pick = await input.showQuickPick({
          title,
          step: 4,
          totalSteps,
          items: [
            ...(offset > 0
              ? [
                  {
                    label: `$(arrow-up) ${i18n.word.previousPage}`,
                    id: -1,
                    item: {},
                  },
                ]
              : []),
            ...pickPlaylistItems(playlists),
            ...(playlists.length === limit
              ? [
                  {
                    label: `$(arrow-down) ${i18n.word.nextPage}`,
                    id: -2,
                    item: {},
                  },
                ]
              : []),
          ],
        });
        if (pick.id === -1) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchPlaylist(input, offset - limit);
        }
        if (pick.id === -2) {
          input.pop();
          return (input: MultiStepInput) =>
            pickSearchPlaylist(input, offset + limit);
        }
        return (input: MultiStepInput) =>
          pickPlaylist(input, 4, pick.item as PlaylistItem);
      }
    })
  );
}
