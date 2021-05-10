import {
  ButtonAction,
  IPC,
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
import { ICON } from "../constant";
import { NeteaseEnum } from "@cloudmusic/shared";
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
  void IPC.netease("searchSuggest", [value]).then((suggestions) => {
    that.items = [that.items[0], ...suggestions.map((label) => ({ label }))];
    that.enabled = true;
    that.busy = false;
  });
}, 256);

export async function inputKeyword(input: MultiStepInput): Promise<InputStep> {
  const items: QuickPickItem[] = (await IPC.netease("searchHotDetail", [])).map(
    ({ searchWord, content }) => ({
      label: searchWord,
      description: ICON.hot,
      detail: content,
    })
  );

  items.unshift({
    label: state.keyword ?? (await IPC.netease("searchDefault", [])),
  });

  const pick = await input.showQuickPick({
    title,
    step: 2,
    totalSteps,
    items,
    placeholder: i18n.sentence.hint.keyword,
    changeCallback: (that, value) => {
      if (value) {
        that.items = [{ label: value }, ...that.items.slice(1)];
        updateSuggestions(that, value);
      } else {
        that.items = items;
      }
    },
  });
  state.keyword = pick.label;
  return (input) => pickType(input);
}

async function pickType(input: MultiStepInput): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title,
    step: 3,
    totalSteps,
    items: [
      {
        label: `${ICON.song} ${i18n.word.single}`,
        type: NeteaseEnum.SearchType.single,
      },
      {
        label: `${ICON.album} ${i18n.word.album}`,
        type: NeteaseEnum.SearchType.album,
      },
      {
        label: `${ICON.artist} ${i18n.word.artist}`,
        type: NeteaseEnum.SearchType.artist,
      },
      {
        label: `${ICON.playlist} ${i18n.word.playlist}`,
        type: NeteaseEnum.SearchType.playlist,
      },
      {
        label: `${ICON.lyric} ${i18n.word.lyric}`,
        type: NeteaseEnum.SearchType.lyric,
      },
    ],
    placeholder: i18n.sentence.hint.search,
  });
  switch (pick.type) {
    case NeteaseEnum.SearchType.single:
      return (input) => pickSearchSingle(input, 0);
    case NeteaseEnum.SearchType.album:
      return (input) => pickSearchAlbum(input, 0);
    case NeteaseEnum.SearchType.artist:
      return (input) => pickSearchArtist(input, 0);
    case NeteaseEnum.SearchType.playlist:
      return (input) => pickSearchPlaylist(input, 0);
    case NeteaseEnum.SearchType.lyric:
      return (input) => pickSearchLyric(input, 0);
  }
  return (input) => pickSearchSingle(input, 0);
}

async function pickSearchSingle(
  input: MultiStepInput,
  offset: number
): Promise<InputStep | void> {
  const songs = await IPC.netease("searchSingle", [
    state.keyword,
    limit,
    offset,
  ]);
  const pick = await input.showQuickPick({
    title,
    step: 4,
    totalSteps,
    items: pickSongItems(songs),
    canSelectMany: true,
    previous: offset > 0,
    next: songs.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSearchSingle(input, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSearchSingle(input, offset + limit));
  if (pick.length === 0) return input.stay();
  if (pick.length === 1) return (input) => pickSong(input, 5, pick[0].item);

  return (input) =>
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
  const albums = await IPC.netease("searchAlbum", [
    state.keyword,
    limit,
    offset,
  ]);
  const pick = await input.showQuickPick({
    title,
    step: 4,
    totalSteps,
    items: pickAlbumItems(albums),
    previous: offset > 0,
    next: albums.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSearchAlbum(input, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSearchAlbum(input, offset + limit));
  return (input) => pickAlbum(input, 5, pick.id);
}

async function pickSearchArtist(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const artists = await IPC.netease("searchArtist", [
    state.keyword,
    limit,
    offset,
  ]);
  const pick = await input.showQuickPick({
    title,
    step: 4,
    totalSteps,
    items: pickArtistItems(artists),
    previous: offset > 0,
    next: artists.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSearchArtist(input, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSearchArtist(input, offset + limit));
  return (input) => pickArtist(input, 5, pick.id);
}

async function pickSearchPlaylist(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const playlists = await IPC.netease("searchPlaylist", [
    state.keyword,
    limit,
    offset,
  ]);
  const pick = await input.showQuickPick({
    title,
    step: 4,
    totalSteps,
    items: pickPlaylistItems(playlists),
    previous: offset > 0,
    next: playlists.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSearchPlaylist(input, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSearchPlaylist(input, offset + limit));
  return (input) => pickPlaylist(input, 5, pick.item);
}

async function pickSearchLyric(
  input: MultiStepInput,
  offset: number
): Promise<InputStep> {
  const songs = await IPC.netease("searchLyric", [
    state.keyword,
    limit,
    offset,
  ]);
  const pick = await input.showQuickPick({
    title,
    step: 4,
    totalSteps,
    items: songs.map((item) => ({
      label: `${ICON.song} ${item.name}`,
      description: item.ar.map((i) => i.name).join("/"),
      detail: item.lyrics.slice(1).join(", "),
      item,
    })),
    canSelectMany: true,
    previous: offset > 0,
    next: songs.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSearchLyric(input, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSearchLyric(input, offset + limit));
  if (pick.length === 0) return input.stay();
  if (pick.length === 1) return (input) => pickSong(input, 5, pick[0].item);

  return (input) =>
    pickSongMany(
      input,
      5,
      pick.map(({ item }) => item)
    );
}
