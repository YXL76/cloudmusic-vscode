import {
  ButtonAction,
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
  pickSongMany,
} from "../../util";
import type { ExtensionContext, QuickPick, QuickPickItem } from "vscode";
import { ICON } from "../../constant";
import type { InputStep } from "../../util";
import { commands } from "vscode";
import { i18n } from "../../i18n";
import { throttle } from "lodash";

const title = i18n.word.search;
const totalSteps = 3;
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

export async function inputKeyword(
  input: MultiStepInput,
  addStep: number
): Promise<InputStep> {
  const hotItems = (await apiSearchHotDetail()).map(
    ({ searchWord, content }) => ({
      label: searchWord,
      description: "$(flame)",
      detail: content,
    })
  );

  const pick = await input.showQuickPick({
    title,
    step: 1 + addStep,
    totalSteps: totalSteps + addStep,
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
  return (input: MultiStepInput) => pickType(input, addStep);
}

async function pickType(input: MultiStepInput, addStep: number) {
  const pick = await input.showQuickPick({
    title,
    step: 2 + addStep,
    totalSteps: totalSteps + addStep,
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
  if (pick.type === SearchType.single) {
    return (input: MultiStepInput) => pickSearchSingle(input, addStep, 0);
  }
  if (pick.type === SearchType.album) {
    return (input: MultiStepInput) => pickSearchAlbum(input, addStep, 0);
  }
  if (pick.type === SearchType.artist) {
    return (input: MultiStepInput) => pickSearchArtist(input, addStep, 0);
  }
  if (pick.type === SearchType.playlist) {
    return (input: MultiStepInput) => pickSearchPlaylist(input, addStep, 0);
  }
  return (input: MultiStepInput) => pickSearchSingle(input, addStep, 0);
}

async function pickSearchSingle(
  input: MultiStepInput,
  addStep: number,
  offset: number
): Promise<InputStep | void> {
  const songs = await apiSearchSingle(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 3 + addStep,
      totalSteps: totalSteps + addStep,
      items: pickSongItems(songs),
    },
    true,
    {
      previous: offset > 0,
      next: songs.length === limit,
    }
  );
  if (pick === ButtonAction.previous) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchSingle(input, addStep, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchSingle(input, addStep, offset + limit);
  }
  if (pick.length === 0) {
    return input.pop();
  }
  if (pick.length === 1) {
    return (input: MultiStepInput) =>
      pickSong(input, 4 + addStep, pick[0].item);
  }
  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      4 + addStep,
      pick.map(({ item }) => item)
    );
}

async function pickSearchAlbum(
  input: MultiStepInput,
  addStep: number,
  offset: number
): Promise<InputStep> {
  const albums = await apiSearchAlbum(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 3 + addStep,
      totalSteps: totalSteps + addStep,
      items: pickAlbumItems(albums),
    },
    undefined,
    {
      previous: offset > 0,
      next: albums.length === limit,
    }
  );
  if (pick === ButtonAction.previous) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchAlbum(input, addStep, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchAlbum(input, addStep, offset + limit);
  }
  return (input: MultiStepInput) => pickAlbum(input, 4 + addStep, pick.id);
}

async function pickSearchArtist(
  input: MultiStepInput,
  addStep: number,
  offset: number
): Promise<InputStep> {
  const artists = await apiSearchArtist(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 3 + addStep,
      totalSteps: totalSteps + addStep,
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
      pickSearchArtist(input, addStep, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchArtist(input, addStep, offset + limit);
  }
  return (input: MultiStepInput) => pickArtist(input, 4 + addStep, pick.id);
}

async function pickSearchPlaylist(
  input: MultiStepInput,
  addStep: number,
  offset: number
): Promise<InputStep> {
  const playlists = await apiSearchPlaylist(state.keyword, limit, offset);
  const pick = await input.showQuickPick(
    {
      title,
      step: 3 + addStep,
      totalSteps: totalSteps + addStep,
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
      pickSearchPlaylist(input, addStep, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSearchPlaylist(input, addStep, offset + limit);
  }
  return (input: MultiStepInput) => pickPlaylist(input, 4 + addStep, pick.item);
}

export function search(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.search", () => {
      void MultiStepInput.run((input) => inputKeyword(input, 0));
    })
  );
}
