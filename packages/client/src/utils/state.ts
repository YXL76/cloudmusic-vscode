import { AccountViewProvider, IPC } from ".";
import { FM_KEY, LYRIC_KEY, REPEAT_KEY, SHOW_LYRIC_KEY } from "../constant";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview";
import { QueueItemTreeItem } from "../treeview";
import i18n from "../i18n";

type Lyric = {
  type: "o" | "t";
  updatePanel?: (oi: number, ti: number) => void;
  updateFontSize?: (size: number) => void;
} & NeteaseTypings.LyricData;

export class State {
  static context: ExtensionContext;

  // TODO
  private static _master = false;

  static get master(): boolean {
    return State._master;
  }

  static set master(value: boolean) {
    if (this._master !== value) {
      this._master = value;
      AccountViewProvider.toggleHTML(value);
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
      this.like = !!(value && value instanceof QueueItemTreeItem);
      // AccountViewProvider.metadata();
      if (this._master) value ? IPC.load() : IPC.stop();
    }
  }

  private static _like = false;

  static get like(): boolean {
    return this._like;
  }

  static set like(newValue: boolean) {
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

  private static _fm = false;

  static get fm(): boolean {
    return State._fm;
  }

  static set fm(value: boolean) {
    if (State._fm !== value) {
      this._fm = value;
      ButtonManager.buttonPrevious(value);
      if (value && this._master) IPC.fmNext();
      void this.context.globalState.update(FM_KEY, value);
    }
  }

  private static _showLyric = false;

  static get showLyric(): boolean {
    return State._showLyric;
  }

  static set showLyric(value: boolean) {
    State._showLyric = value;
    void this.context.globalState.update(SHOW_LYRIC_KEY, value);
  }

  private static _lyric: Lyric = {
    type: "o",
    o: { time: [0], text: ["~"] },
    t: { time: [0], text: ["~"] },
  };

  static get lyric(): Lyric {
    return State._lyric;
  }

  static set lyric(value: Lyric) {
    State._lyric = value;
    void this.context.globalState.update(LYRIC_KEY, value);
  }

  static init(): void {
    this.repeat = this.context.globalState.get(REPEAT_KEY, false);
    this.fm = this.context.globalState.get(FM_KEY, false);
    this._showLyric = this.context.globalState.get(SHOW_LYRIC_KEY, false);
    this._lyric = this.context.globalState.get(LYRIC_KEY, {
      type: "o",
      o: { time: [0], text: ["~"] },
      t: { time: [0], text: ["~"] },
    });
  }
}
