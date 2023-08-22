import { AccountManager, BUTTON_MANAGER } from "../manager/index.js";
import { AccountViewProvider, IPC } from "./index.js";
import { FM_KEY, LYRIC_KEY, PLAYER_MODE, QUEUE_INIT, REPEAT_KEY, SHOW_LYRIC_KEY } from "../constant/index.js";
import { QueueItemTreeItem, QueueProvider } from "../treeview/index.js";
import type { ExtensionContext } from "vscode";
import type { NeteaseTypings } from "api";
import type { QueueContent } from "../treeview/index.js";
import i18n from "../i18n/index.js";
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
          return parseInt(major) >= 1 && parseInt(minor) >= 71 && parseInt(minor) < 74;
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

  #fmUid?: number;

  #showLyric = false;

  #lyric: Lyric = defaultLyric;

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

  get fmUid(): number | undefined {
    return this.#fmUid;
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
      this.#setPlayItem(value);
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
  set fmUid(value: number | undefined) {
    if (this.#fmUid !== value) {
      this.#fmUid = value;
      BUTTON_MANAGER.buttonPrevious(!!value);
      if (this.#master) {
        if (this.#fmUid) {
          IPC.netease("personalFm", [this.#fmUid, true])
            .then((i) => i && (this.playItem = QueueItemTreeItem.new({ ...i, pid: i.al.id, itemType: "q" })))
            .catch(console.error);
        }
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

  // eslint-disable-next-line @typescript-eslint/member-ordering
  #initPlay?: boolean;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  #initSeek?: number;

  downInit(play?: boolean, seek?: number) {
    if (play !== undefined) this.#initPlay = play;
    if (seek !== undefined) this.#initSeek = seek;

    if (this.#initializing <= -1) return;
    --this.#initializing;
    if (this.#initializing > 0) return;

    if (this.#initializing === 0) {
      if (!this.first) {
        --this.#initializing;
        return void this.#downInit();
      }

      switch (QUEUE_INIT) {
        case "none":
          return IPC.new([]);
        case "restore":
          return IPC.retain();
        case "recommend": {
          if (!AccountManager.accounts.size) return IPC.new([]);
          const [[uid]] = AccountManager.accounts;
          return void IPC.netease("recommendSongs", [uid])
            .catch(() => [])
            .then((songs) =>
              IPC.new(songs.map((song) => QueueItemTreeItem.new({ ...song, pid: song.al.id, itemType: "q" }).data)),
            );
        }
      }
    } else void this.#downInit();
  }

  #setPlayItem(value?: QueueContent) {
    this.#playItem = value;
    this.like = !!(value && value instanceof QueueItemTreeItem);
    AccountViewProvider.metadata();
  }

  async #downInit(): Promise<void> {
    this.repeat = CONTEXT.context.globalState.get(REPEAT_KEY, false);

    this.#fmUid = CONTEXT.context.globalState.get(FM_KEY, undefined);
    if (this.#fmUid) {
      /** From {@link fmUid}*/
      BUTTON_MANAGER.buttonPrevious(true);
      const item = await IPC.netease("personalFm", [this.#fmUid, false]).catch(console.error);
      if (item) this.#setPlayItem(QueueItemTreeItem.new({ ...item, pid: item.al.id, itemType: "q" }));
    } else this.#setPlayItem(QueueProvider.head);

    if (this.#master) {
      const play = this.#initPlay ?? false;
      IPC.load(play, this.#initSeek);
      BUTTON_MANAGER.buttonPlay(play);
    }
    BUTTON_MANAGER.buttonSong(this.#playItem);

    this.#showLyric = CONTEXT.context.globalState.get(SHOW_LYRIC_KEY, false);

    this.#lyric = CONTEXT.context.globalState.get(LYRIC_KEY, defaultLyric);

    CONTEXT.context.subscriptions.push(
      QueueProvider.getInstance().onDidChangeTreeData(() => {
        this.fmUid = undefined;
        this.playItem = QueueProvider.head;
      }),
    );
  }
}

export const STATE = new State();
