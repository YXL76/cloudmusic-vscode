import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC } from ".";
import { FM_KEY, REPEAT_KEY } from "../constant";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  RadioProvider,
} from "../treeview";
import type { ExtensionContext } from "vscode";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";

type Lyric = {
  type: "o" | "t";
  updatePanel?: (oi: number, ti: number) => void;
  updateFontSize?: (size: number) => void;
} & NeteaseTypings.LyricData;

export const lyric: Lyric = {
  type: "o",
  o: { time: [0], text: ["~"] },
  t: { time: [0], text: ["~"] },
};

export const enum LikeState {
  none = -1,
  like = 1,
  dislike = 0,
}

export class State {
  static context: ExtensionContext;

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
    void this.context.globalState.update(REPEAT_KEY, value);
  }

  private static _playItem?: QueueContent;

  static get playItem(): QueueContent | undefined {
    return State._playItem;
  }

  static set playItem(value: QueueContent | undefined) {
    if (value !== this._playItem) {
      this._playItem = value;
      this.like =
        value && value instanceof QueueItemTreeItem
          ? AccountManager.likelist.has(value.item.id)
            ? LikeState.like
            : LikeState.dislike
          : LikeState.none;
      AccountViewProvider.metadata(this._playItem);
      if (this._master && this._login)
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
    else if (this._playItem)
      ButtonManager.buttonSong(
        this._playItem.item.name,
        this._playItem.tooltip
      );
  }

  private static _login = false;

  static get login(): boolean {
    return this._login;
  }

  static set login(value: boolean) {
    if (value !== this._login) {
      this._login = value;
      if (!value) {
        ButtonManager.hide();
        if (this._master) IPC.clear();
        return;
      }
      ButtonManager.buttonAccount(AccountManager.nickname);
      ButtonManager.show();
      PlaylistProvider.refresh();
      RadioProvider.refresh();
      if (!this.first) return;
      this.first = false;
      IPC.netease("recommendSongs", [])
        .then((songs) =>
          IPC.new(
            songs.map((song) => QueueItemTreeItem.new({ ...song, pid: 0 }).data)
          )
        )
        .catch(console.error);
    }
  }

  private static _fm = false;

  public static get fm(): boolean {
    return State._fm;
  }

  public static set fm(value: boolean) {
    if (State._fm !== value) {
      this._fm = value;
      ButtonManager.buttonPrevious(value);
      if (value && this._master) IPC.fmNext();
      void this.context.globalState.update(FM_KEY, value);
    }
  }

  static init(): void {
    this.repeat = this.context.globalState.get(REPEAT_KEY, false);
    this.fm = this.context.globalState.get(FM_KEY, false);
  }
}
