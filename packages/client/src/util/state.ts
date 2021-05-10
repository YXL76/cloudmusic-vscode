import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC } from ".";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  RadioProvider,
} from "../treeview";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";

export const enum LyricType {
  original = "o",
  translation = "t",
}

type Lyric = {
  index: number;
  delay: number;
  type: LyricType;
  updatePanel?: (index: number) => void;
  updateFontSize?: (size: number) => void;
} & Omit<NeteaseTypings.LyricData, "ctime">;

export const lyric: Lyric = {
  index: 0,
  delay: -1.0,
  type: LyricType.original,
  time: [0],
  o: { text: [i18n.word.lyric] },
  t: { text: [i18n.word.lyric] },
};

export const setLyric = (
  index: number,
  time: number[],
  o: NeteaseTypings.LyricSpecifyData,
  t: NeteaseTypings.LyricSpecifyData
): void => {
  lyric.index = index;
  lyric.time = time;
  lyric.o = o;
  lyric.t = t;
};

export const enum LikeState {
  none = -1,
  like = 1,
  dislike = 0,
}

export class State {
  static first = true;

  static _master = false;

  static get master(): boolean {
    return State._master;
  }

  static set master(value: boolean) {
    if (value !== this.master) {
      this._master = value;
      AccountViewProvider.master();
    }
  }

  private static _repeat = false;

  static get repeat(): boolean {
    return State._repeat;
  }

  static set repeat(value: boolean) {
    State._repeat = value;
    ButtonManager.buttonRepeat(value);
  }

  private static _playItem?: QueueContent;

  static get playItem(): QueueContent | undefined {
    return State._playItem;
  }

  static set playItem(value: QueueContent | undefined) {
    if (value !== this._playItem) {
      this._playItem = value;
      if (this.master)
        if (value) IPC.load();
        else IPC.stop();
    }
  }

  private static _like = LikeState.none;

  static get like(): LikeState {
    return this._like;
  }

  static set like(newValue: LikeState) {
    if (newValue !== this._like) {
      this._like = newValue;
      ButtonManager.buttonLike(newValue);
    }
  }

  private static _loading = false;

  static get loading(): boolean {
    return this._loading;
  }

  static set loading(value: boolean) {
    // if (value === this._loading) return;
    this._loading = value;
    if (value)
      ButtonManager.buttonSong(
        `$(loading~spin) ${i18n.word.song}: ${i18n.word.loading}`
      );
    else if (this._playItem) {
      const { name, id } = this._playItem.item;
      ButtonManager.buttonSong(name, this._playItem.tooltip);
      this.like =
        this._playItem instanceof QueueItemTreeItem
          ? AccountManager.likelist.has(id)
            ? LikeState.like
            : LikeState.dislike
          : LikeState.none;
      AccountViewProvider.metadata(this._playItem);
    }
  }

  private static _login = false;

  static get login(): boolean {
    return this._login;
  }

  static set login(value: boolean) {
    if (value !== this._login) {
      this._login = value;
      PlaylistProvider.refresh();
      RadioProvider.refresh();
      if (!value) {
        ButtonManager.hide();
        if (this._master) IPC.clear();
        return;
      }
      ButtonManager.buttonAccount(AccountManager.nickname);
      ButtonManager.show();
      if (!this.first) return;
      if (this._master)
        IPC.netease("recommendSongs", [])
          .then((songs) =>
            IPC.new(
              songs.map(
                (song) => QueueItemTreeItem.new({ ...song, pid: 0 }).data
              )
            )
          )
          .catch(console.error);
    }
  }
}

// TODO
/* export class PersonalFm {
  private static item: QueueItemTreeItem[] = [];

  private static _state = false;

  static get state(): boolean {
    return this._state;
  }

  static set state(newValue: boolean) {
    if (newValue !== this._state) {
      this._state = newValue;
      ButtonManager.buttonPrevious(newValue);
      if (newValue) void this.next().then(load);
    }
  }

  static async head(): Promise<QueueItemTreeItem> {
    if (this.item.length === 0) {
      const songs = await apiPersonalFm();
      this.item = songs.map((song) => new QueueItemTreeItem(song, 0));
    }

    return this.item.splice(0, 1)[0];
  }

  static async next(): Promise<QueueItemTreeItem> {
    if (this.item.length <= 1) {
      const songs = await apiPersonalFm();
      this.item.push(...songs.map((song) => new QueueItemTreeItem(song, 0)));
    }

    return this.item[1];
  }
} */
