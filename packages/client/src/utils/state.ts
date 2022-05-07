import { AccountManager, ButtonManager } from "../manager";
import { AccountViewProvider, IPC } from ".";
import {
  FM_KEY,
  LYRIC_KEY,
  PLAYER_MODE,
  QUEUE_INIT,
  REPEAT_KEY,
  SHOW_LYRIC_KEY,
} from "../constant";
import { QueueItemTreeItem, QueueProvider } from "../treeview";
import type { ExtensionContext } from "vscode";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";

export const enum LyricType {
  ori = 0, // original
  tra = 1, // translation
  rom = 2, // romanization
}

type Lyric = {
  type: LyricType;
  updatePanel?: (text: NeteaseTypings.LyricData["text"]) => void;
  updateIndex?: (idx: number) => void;
} & NeteaseTypings.LyricData;

export const defaultLyric: Lyric = {
  type: LyricType.ori,
  time: [0],
  text: [["~", "~", "~"]],
  user: [],
};

export class State {
  static context: ExtensionContext;

  static wasm = PLAYER_MODE === "wasm";

  static first = false;

  // To finish initialization needs 3 steps
  // 1. Started the IPC server / Received the queue
  // 2. Received `IPCControl.netease`
  // 3. In native mode / `AccountViewProvider` is ready
  private static _initializing = 3;

  private static _master = false;

  private static _repeat = false;

  private static _playItem?: QueueContent;

  private static _like = false;

  private static _fm = false;

  private static _showLyric = false;

  private static _lyric: Lyric = defaultLyric;

  static get master(): boolean {
    return this._master;
  }

  static get repeat(): boolean {
    return this._repeat;
  }

  static get playItem(): QueueContent | undefined {
    return this._playItem;
  }

  static get like(): boolean {
    return this._like;
  }

  static get fm(): boolean {
    return this._fm;
  }

  static get showLyric(): boolean {
    return this._showLyric;
  }

  static get lyric(): Lyric {
    return this._lyric;
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set master(value: boolean) {
    if (this._master !== value) {
      this._master = value;
      AccountViewProvider.master();
      // if (this._master) IPC.pid();
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set repeat(value: boolean) {
    this._repeat = value;
    ButtonManager.buttonRepeat(value);
    if (this._master) void this.context.globalState.update(REPEAT_KEY, value);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set playItem(value: QueueContent | undefined) {
    if (value !== this._playItem) {
      this._playItem = value;
      this.like = !!(value && value instanceof QueueItemTreeItem);
      AccountViewProvider.metadata();
      if (this._master) value ? IPC.load() : IPC.stop();
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set like(newValue: boolean) {
    if (newValue !== this._like) {
      this._like = newValue;
      ButtonManager.buttonLike();
    }
  }

  static set loading(value: boolean) {
    // if (value === this._loading) return;
    ButtonManager.buttonSong(
      value
        ? `$(loading~spin) ${i18n.word.song}: ${i18n.word.loading}`
        : this._playItem
    );
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set fm(value: boolean) {
    if (this._fm !== value) {
      this._fm = value;
      ButtonManager.buttonPrevious(value);
      if (this._master) {
        if (value) IPC.fmNext();
        else IPC.fm(false); // Only need to tell the server. Do not reply.
        void this.context.globalState.update(FM_KEY, value);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set showLyric(value: boolean) {
    this._showLyric = value;
    void this.context.globalState.update(SHOW_LYRIC_KEY, value);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static set lyric(value: Lyric) {
    this._lyric = value;
    ButtonManager.buttonLyric();
    if (this._master) void this.context.globalState.update(LYRIC_KEY, value);
    value.updatePanel?.(value.text);
  }

  static downInit() {
    if (this._initializing <= 0) return;
    --this._initializing;
    if (this._initializing !== 0) return;

    this.repeat = this.context.globalState.get(REPEAT_KEY, false);

    /** From {@link fm}*/
    {
      const value = this.context.globalState.get(FM_KEY, false);
      this._fm = value;
      ButtonManager.buttonPrevious(value);
      if (value && this.first) IPC.fmNext();
    }

    this._showLyric = this.context.globalState.get(SHOW_LYRIC_KEY, false);

    this._lyric = this.context.globalState.get(LYRIC_KEY, defaultLyric);

    /** From {@link playItem}*/
    if (!this._fm) {
      const { head } = QueueProvider;
      this._playItem = head;
      this.like = !!(head && head instanceof QueueItemTreeItem);
      AccountViewProvider.metadata();
    }

    (async () => {
      if (this.first && AccountManager.accounts.size) {
        const [[uid]] = AccountManager.accounts;
        switch (QUEUE_INIT) {
          case "none":
            return; // No need to sleep
          case "restore":
            IPC.retain();
            break;
          case "recommend": {
            const songs = await IPC.netease("recommendSongs", [uid]);
            const items = songs.map(
              (song) => QueueItemTreeItem.new({ ...song, pid: song.al.id }).data
            );
            IPC.new(items);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1024)); // The queue maybe ready
      } else {
        /** {@link loading} */
        ButtonManager.buttonSong(QueueProvider.head);
      }
    })()
      .then(() =>
        this.context.subscriptions.push(
          // Prevent first loading [#507](https://github.com/YXL76/cloudmusic-vscode/issues/507)
          QueueProvider.getInstance().onDidChangeTreeData(() => {
            this.fm = false;
            this.playItem = QueueProvider.head;
          })
        )
      )
      .catch(console.error);
  }
}
