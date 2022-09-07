import { AccountManager, BUTTON_MANAGER } from "../manager";
import { AccountViewProvider, IPC } from "./index";
import { FM_KEY, LYRIC_KEY, PLAYER_MODE, QUEUE_INIT, REPEAT_KEY, SHOW_LYRIC_KEY } from "../constant";
import { QueueItemTreeItem, QueueProvider } from "../treeview";
import type { ExtensionContext } from "vscode";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";
import { version } from "vscode";

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

export const defaultLyric: Lyric = { type: LyricType.ori, time: [0], text: [["~", "~", "~"]], user: [] };

export const CONTEXT = <{ context: ExtensionContext }>{};

class State {
  wasm =
    PLAYER_MODE === "auto"
      ? (() => {
          const [major, minor] = version.split(".");
          // Use `wasm` if version >= 1.71.0
          // https://github.com/microsoft/vscode/issues/118275
          return parseInt(major) >= 1 && parseInt(minor) >= 71;
        })()
      : PLAYER_MODE === "wasm";

  first = false;

  // To finish initialization needs 3 steps
  // 1. Started the IPC server / Received the queue
  // 2. Received `IPCControl.netease`
  // 3. In native mode / `AccountViewProvider` is ready
  #initializing = 3;

  #master = false;

  #repeat = false;

  #playItem?: QueueContent;

  #like = false;

  #fm = false;

  #showLyric = false;

  #lyric: Lyric = defaultLyric;

  #cb?: () => void;

  get master(): boolean {
    return this.#master;
  }

  get repeat(): boolean {
    return this.#repeat;
  }

  get playItem(): QueueContent | undefined {
    return this.#playItem;
  }

  get like(): boolean {
    return this.#like;
  }

  get fm(): boolean {
    return this.#fm;
  }

  get showLyric(): boolean {
    return this.#showLyric;
  }

  get lyric(): Lyric {
    return this.#lyric;
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set master(value: boolean) {
    if (this.#master !== value) {
      this.#master = value;
      AccountViewProvider.master();
      // if (this.#master) IPC.pid();
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set repeat(value: boolean) {
    this.#repeat = value;
    BUTTON_MANAGER.buttonRepeat(value);
    if (this.#master) void CONTEXT.context.globalState.update(REPEAT_KEY, value);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set playItem(value: QueueContent | undefined) {
    if (value !== this.#playItem) {
      this.#playItem = value;
      this.like = !!(value && value instanceof QueueItemTreeItem);
      AccountViewProvider.metadata();
      if (this.#master) value ? IPC.load() : IPC.stop();
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set like(newValue: boolean) {
    if (newValue !== this.#like) {
      this.#like = newValue;
      BUTTON_MANAGER.buttonLike();
    }
  }

  set loading(value: boolean) {
    // if (value === this.#loading) return;
    BUTTON_MANAGER.buttonSong(value ? `$(loading~spin) ${i18n.word.song}: ${i18n.word.loading}` : this.#playItem);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set fm(value: boolean) {
    if (this.#fm !== value) {
      this.#fm = value;
      BUTTON_MANAGER.buttonPrevious(value);
      if (this.#master) {
        if (value) IPC.fmNext();
        else IPC.fm(false); // Only need to tell the server. Do not reply.
        void CONTEXT.context.globalState.update(FM_KEY, value);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set showLyric(value: boolean) {
    this.#showLyric = value;
    void CONTEXT.context.globalState.update(SHOW_LYRIC_KEY, value);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set lyric(value: Lyric) {
    this.#lyric = value;
    BUTTON_MANAGER.buttonLyric();
    if (this.#master) void CONTEXT.context.globalState.update(LYRIC_KEY, value);
    value.updatePanel?.(value.text);
  }

  addOnceInitCallback(cb: () => void) {
    if (this.#initializing <= 0) return;
    this.#cb = cb;
  }

  downInit() {
    if (this.#initializing <= 0) return;
    --this.#initializing;
    if (this.#initializing !== 0) return;

    this.repeat = CONTEXT.context.globalState.get(REPEAT_KEY, false);

    /** From {@link fm}*/
    {
      const value = CONTEXT.context.globalState.get(FM_KEY, false);
      this.#fm = value;
      BUTTON_MANAGER.buttonPrevious(value);
      if (value && this.first) IPC.fmNext();
    }

    this.#showLyric = CONTEXT.context.globalState.get(SHOW_LYRIC_KEY, false);

    this.#lyric = CONTEXT.context.globalState.get(LYRIC_KEY, defaultLyric);

    /** From {@link playItem}*/
    if (!this.#fm) {
      const { head } = QueueProvider;
      this.#playItem = head;
      this.like = !!(head && head instanceof QueueItemTreeItem);
      AccountViewProvider.metadata();
    }

    (async () => {
      if (!this.first || !AccountManager.accounts.size) {
        /** {@link loading} */
        return BUTTON_MANAGER.buttonSong(QueueProvider.head);
      }

      const [[uid]] = AccountManager.accounts;
      switch (QUEUE_INIT) {
        case "none":
          return; // No need to sleep
        case "restore":
          IPC.retain();
          break;
        case "recommend": {
          const songs = await IPC.netease("recommendSongs", [uid]);
          const items = songs.map((song) => QueueItemTreeItem.new({ ...song, pid: song.al.id, itemType: "q" }).data);
          IPC.new(items);
        }
      }
      return new Promise((resolve) => setTimeout(resolve, 1024)); // The queue maybe ready
    })()
      .catch(console.error)
      .finally(() => {
        CONTEXT.context.subscriptions.push(
          // Prevent first loading [#507](https://github.com/YXL76/cloudmusic-vscode/issues/507)
          QueueProvider.getInstance().onDidChangeTreeData(() => {
            this.fm = false;
            this.playItem = QueueProvider.head;
          })
        );
        if (this.#cb) {
          this.#cb();
          this.#cb = undefined;
        }
      });
  }
}

export const STATE = new State();
