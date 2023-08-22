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
} from "./index.js";
import type { InputStep, MultiStepInput } from "./index.js";
import type { QuickPick, QuickPickItem } from "vscode";
import { NeteaseSearchType } from "@cloudmusic/shared";
import i18n from "../i18n/index.js";
import { throttle } from "lodash";

const title = i18n.word.search;
const totalSteps = 4;
const limit = 30;

type State = { keyword: string };

export async function inputKeyword(input: MultiStepInput, uid: number): Promise<InputStep> {
  const state = <State>{};

  const items: QuickPickItem[] = [
    { label: state.keyword ?? (await IPC.netease("searchDefault", [uid])) },
    ...(await IPC.netease("searchHotDetail", [uid])).map(({ searchWord, content }) => ({
      label: searchWord,
      description: "$(flame)",
      detail: content,
    })),
  ];

  const updateSuggestions = throttle((that: QuickPick<QuickPickItem>, value) => {
    // that.enabled = false;
    that.busy = true;
    IPC.netease("searchSuggest", [uid, value])
      .then((suggestions) => (that.items = [that.items[0], ...suggestions.map((label) => ({ label }))]))
      .catch(console.error)
      .finally(() => {
        that.busy = false;
        // that.enabled = true;
      });
  }, 512);

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
      } else that.items = items;
    },
  });
  state.keyword = pick.label;

  return (input) => pickType(input);

  async function pickType(input: MultiStepInput): Promise<InputStep> {
    const pick = await input.showQuickPick({
      title,
      step: 3,
      totalSteps,
      items: [
        { label: `$(zap) ${i18n.word.single}`, type: NeteaseSearchType.single },
        { label: `$(circuit-board) ${i18n.word.album}`, type: NeteaseSearchType.album },
        { label: `$(account) ${i18n.word.artist}`, type: NeteaseSearchType.artist },
        { label: `$(list-unordered) ${i18n.word.playlist}`, type: NeteaseSearchType.playlist },
        { label: `$(text-size) ${i18n.word.lyric}`, type: NeteaseSearchType.lyric },
      ],
      placeholder: i18n.sentence.hint.search,
    });
    switch (pick.type) {
      case NeteaseSearchType.single:
        return (input) => pickSearchSingle(input, 0);
      case NeteaseSearchType.album:
        return (input) => pickSearchAlbum(input, 0);
      case NeteaseSearchType.artist:
        return (input) => pickSearchArtist(input, 0);
      case NeteaseSearchType.playlist:
        return (input) => pickSearchPlaylist(input, 0);
      case NeteaseSearchType.lyric:
        return (input) => pickSearchLyric(input, 0);
    }
    return (input) => pickSearchSingle(input, 0);
  }

  async function pickSearchSingle(input: MultiStepInput, offset: number): Promise<InputStep | void> {
    const songs = await IPC.netease("searchSingle", [uid, state.keyword, limit, offset]);
    const pick = await input.showQuickPick({
      title,
      step: 4,
      totalSteps,
      items: pickSongItems(songs),
      canSelectMany: true,
      previous: offset > 0,
      next: songs.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickSearchSingle(input, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickSearchSingle(input, offset + limit));
    if (pick.length === 0) return input.stay();
    if (pick.length === 1) return (input) => pickSong(input, 5, pick[0].item);

    return (input) =>
      pickSongMany(
        input,
        5,
        pick.map(({ item }) => item),
      );
  }

  async function pickSearchAlbum(input: MultiStepInput, offset: number): Promise<InputStep> {
    const albums = await IPC.netease("searchAlbum", [uid, state.keyword, limit, offset]);
    const pick = await input.showQuickPick({
      title,
      step: 4,
      totalSteps,
      items: pickAlbumItems(albums),
      previous: offset > 0,
      next: albums.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickSearchAlbum(input, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickSearchAlbum(input, offset + limit));
    return (input) => pickAlbum(input, 5, pick.id);
  }

  async function pickSearchArtist(input: MultiStepInput, offset: number): Promise<InputStep> {
    const artists = await IPC.netease("searchArtist", [uid, state.keyword, limit, offset]);
    const pick = await input.showQuickPick({
      title,
      step: 4,
      totalSteps,
      items: pickArtistItems(artists),
      previous: offset > 0,
      next: artists.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickSearchArtist(input, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickSearchArtist(input, offset + limit));
    return (input) => pickArtist(input, 5, pick.id);
  }

  async function pickSearchPlaylist(input: MultiStepInput, offset: number): Promise<InputStep> {
    const playlists = await IPC.netease("searchPlaylist", [uid, state.keyword, limit, offset]);
    const pick = await input.showQuickPick({
      title,
      step: 4,
      totalSteps,
      items: pickPlaylistItems(playlists),
      previous: offset > 0,
      next: playlists.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickSearchPlaylist(input, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickSearchPlaylist(input, offset + limit));
    return (input) => pickPlaylist(input, 5, pick.item);
  }

  async function pickSearchLyric(input: MultiStepInput, offset: number): Promise<InputStep> {
    const songs = await IPC.netease("searchLyric", [uid, state.keyword, limit, offset]);
    const pick = await input.showQuickPick({
      title,
      step: 4,
      totalSteps,
      items: songs.map((item) => ({
        label: `$(zap) ${item.name}`,
        description: item.ar.map(({ name }) => name).join("/"),
        detail: item.lyrics.slice(1).join(", "),
        item,
      })),
      canSelectMany: true,
      previous: offset > 0,
      next: songs.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickSearchLyric(input, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickSearchLyric(input, offset + limit));
    if (pick.length === 0) return input.stay();
    if (pick.length === 1) return (input) => pickSong(input, 5, pick[0].item);

    return (input) =>
      pickSongMany(
        input,
        5,
        pick.map(({ item }) => item),
      );
  }
}
