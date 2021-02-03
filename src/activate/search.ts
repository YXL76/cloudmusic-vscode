import {
  ButtonAction,
  pickAlbum,
  pickAlbumItems,
  pickArtist,
  pickArtistItems,
  pickPlaylist,
  pickPlaylistItems,
  pickSong,
  pickSongItems,
  pickSongMany,
} from "../util";
import type { InputStep, MultiStepInput } from "../util";
import type { QuickPick, QuickPickItem } from "vscode";
import {
  SearchType,
  apiSearchAlbum,
  apiSearchArtist,
  apiSearchDefault,
  apiSearchHotDetail,
  apiSearchPlaylist,
  apiSearchSingle,
  apiSearchSuggest,
} from "../api";
import { ICON } from "../constant";
import i18n from "../i18n";
import { throttle } from "lodash";

const title = i18n.word.search;
const totalSteps = 4;
const limit = 30;

type State = {
  keyword: string;
};

const state = {} as State;

const updateSuggestions = throttle((that: QuickPick<QuickPickItem>, value) => {
  that.enabled = false;
  that.busy = true;
  void apiSearchSuggest(value).then((suggestions) => {
    that.items = [that.items[0]].concat(
      suggestions.map((label) => ({ label }))
    );
    that.enabled = true;
    that.busy = false;
  });
}, 256);

export async function inputKeyword(input: MultiStepInput): Promise<InputStep> {
  const items: QuickPickItem[] = (await apiSearchHotDetail()).map(
    ({ searchWord, content }) => ({
      label: searchWord,
      description: ICON.hot,
      detail: content,
    })
  );

  items.unshift({ label: state.keyword ?? (await apiSearchDefault()) });

  const pick = await input.showQuickPick({
    title,
    step: 2,
    totalSteps,
    items,
    placeholder: i18n.sentence.hint.keyword,
    changeCallback: (that, value) => {
      if (value) {
        that.items = [{ label: value }].concat(that.items.slice(1));
        updateSuggestions(that, value);
      } else {
        that.items = items;
      }
    },
  });
  state.keyword = pick.label;
  return (input: MultiStepInput) => pickType(input);
}

async function pickType(input: MultiStepInput) {
  const pick = await input.showQuickPick({
    title,
    step: 3,
    totalSteps,
    items: [
      {
        label: `${ICON.song} ${i18n.word.single}`,
        type: SearchType.single,
      },
      {
        label: `${ICON.album} ${i18n.word.album}`,
        type: SearchType.album,
      },
      {
        label: `${ICON.artist} ${i18n.word.artist}`,
        type: SearchType.artist,
      },
      {
        label: `${ICON.playlist} ${i18n.word.playlist}`,
        type: SearchType.playlist,
      },
    ],
    placeholder: i18n.sentence.hint.search,
  });
  switch (pick.type) {
    case SearchType.single:
      return (input: MultiStepInput) => pickSearchSingle(input, 0);
    case SearchType.album:
      return (input: MultiStepInput) => pickSearchAlbum(input, 0);
    case SearchType.artist:
      return (input: MultiStepInput) => pickSearchArtist(input, 0);
    case SearchType.playlist:
      return (input: MultiStepInput) => pickSearchPlaylist(input, 0);
  }
  return (input: MultiStepInput) => pickSearchSingle(input, 0);
}

async function pickSearchSingle(
  input: MultiStepInput,
  offset: number
): Promise<InputStep | void> {
  const songs = await apiSearchSingle(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 4,
      totalSteps,
      items: pickSongItems(songs),
    },
    true,
    {
      previous: offset > 0,
      next: songs.length === limit,
    }
  );
  if (pick === ButtonAction.previous)
    return input.stay((input: MultiStepInput) =>
      pickSearchSingle(input, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSearchSingle(input, offset + limit)
    );
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input: MultiStepInput) => pickSong(input, 5, pick[0].item);

  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      5,
      pick.map(({ item }) => item)
    );
}

async function pickSearchAlbum(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const albums = await apiSearchAlbum(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 4,
      totalSteps,
      items: pickAlbumItems(albums),
    },
    undefined,
    {
      previous: offset > 0,
      next: albums.length === limit,
    }
  );
  if (pick === ButtonAction.previous)
    return input.stay((input: MultiStepInput) =>
      pickSearchAlbum(input, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSearchAlbum(input, offset + limit)
    );
  return (input: MultiStepInput) => pickAlbum(input, 5, pick.id);
}

async function pickSearchArtist(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const artists = await apiSearchArtist(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 4,
      totalSteps,
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
      pickSearchArtist(input, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSearchArtist(input, offset + limit)
    );
  return (input: MultiStepInput) => pickArtist(input, 5, pick.id);
}

async function pickSearchPlaylist(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const playlists = await apiSearchPlaylist(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 4,
      totalSteps,
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
      pickSearchPlaylist(input, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSearchPlaylist(input, offset + limit)
    );
  return (input: MultiStepInput) => pickPlaylist(input, 5, pick.item);
}
