import { EventEmitter, ThemeIcon, TreeItem, window } from "vscode";
import type { ExtensionContext, TreeDataProvider } from "vscode";
import { LocalFileTreeItem, ProgramTreeItem } from ".";
import type { PlayTreeItem, PlayTreeItemData, QueueContent } from ".";
import { QUEUE_KEY, TreeItemId, UNBLOCK_MUSIC, unplayable } from "../constant";
import type { SongsItem } from "../constant";
import i18n from "../i18n";
import { unsortInplace } from "array-unsort";

export const enum QueueSortType {
  song,
  album,
  artist,
}

export const enum QueueSortOrder {
  ascending,
  descending,
}

let infoFlag = false;

export class QueueProvider implements TreeDataProvider<QueueContent> {
  static context: ExtensionContext;

  private static songs: QueueContent[] = [];

  private static instance: QueueProvider;

  private static readonly ids = new Set<string | number>();

  _onDidChangeTreeData = new EventEmitter<QueueContent | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  static get len(): number {
    return this.songs.length;
  }

  static get head(): QueueContent | undefined {
    return this.songs?.[0];
  }

  static get next(): QueueContent | undefined {
    return this.songs?.[1];
  }

  static new(elements: QueueContent[], id?: number): void {
    this._clear();
    this._add(elements);
    id ? this.top(id) : this.instance._onDidChangeTreeData.fire();
  }

  static clear(): void {
    this._clear();

    this.instance._onDidChangeTreeData.fire();
  }

  static random(): void {
    this.songs = [this.songs[0], ...unsortInplace(this.songs.slice(1))];

    this.instance._onDidChangeTreeData.fire();
  }

  static top(id: number | string): void {
    this.shift(this.songs.findIndex((value) => value.valueOf === id));
  }

  static shift(index: number): void {
    this._shift(index);

    this.instance._onDidChangeTreeData.fire();
  }

  static add(elements: QueueContent[], index: number = this.len): void {
    this._add(elements, index);

    this.instance._onDidChangeTreeData.fire();
  }

  static delete(id: number | string): void {
    const index = this.songs.findIndex(({ valueOf }) => valueOf === id);
    if (index >= 0)
      this.songs
        .splice(index, 1)
        .forEach(({ valueOf }) => this.ids.delete(valueOf));

    this.instance._onDidChangeTreeData.fire();
  }

  static sort(type: QueueSortType, order: QueueSortOrder): void {
    switch (type) {
      case QueueSortType.song:
        this.songs.sort(
          order === QueueSortOrder.ascending
            ? ({ label: a }, { label: b }) => a.localeCompare(b)
            : ({ label: a }, { label: b }) => b.localeCompare(a)
        );
        break;
      case QueueSortType.album:
        this.songs.sort(
          order === QueueSortOrder.ascending
            ? (
                {
                  item: {
                    al: { name: a },
                  },
                },
                {
                  item: {
                    al: { name: b },
                  },
                }
              ) => a.localeCompare(b)
            : (
                {
                  item: {
                    al: { name: a },
                  },
                },
                {
                  item: {
                    al: { name: b },
                  },
                }
              ) => b.localeCompare(a)
        );
        break;
      case QueueSortType.artist:
        this.songs.sort(
          order === QueueSortOrder.ascending
            ? (
                {
                  item: {
                    ar: [{ name: a }],
                  },
                },
                {
                  item: {
                    ar: [{ name: b }],
                  },
                }
              ) => a.localeCompare(b)
            : (
                {
                  item: {
                    ar: [{ name: a }],
                  },
                },
                {
                  item: {
                    ar: [{ name: b }],
                  },
                }
              ) => b.localeCompare(a)
        );
    }

    this.instance._onDidChangeTreeData.fire();
  }

  static newRaw(items: PlayTreeItemData[], id?: number): void {
    this.new(this._parseRaw(items), id);
  }

  static addRaw(items: PlayTreeItemData[], index?: number): void {
    this.add(this._parseRaw(items), index);
  }

  private static _parseRaw(items: PlayTreeItemData[]): QueueContent[] {
    return items.map((item) => {
      switch (item.id) {
        case TreeItemId.local:
          return new LocalFileTreeItem(...item.ctr);
        case TreeItemId.program:
          return new ProgramTreeItem(...item.ctr);
        default:
          return new QueueItemTreeItem(...item.ctr);
      }
    });
  }

  private static _add(
    elements: QueueContent[],
    index: number = this.len
  ): void {
    // TODO play next
    const selected = UNBLOCK_MUSIC.enabled
      ? elements.filter(({ valueOf }) => !this.ids.has(valueOf))
      : elements.filter(
          ({ valueOf }) =>
            !this.ids.has(valueOf) &&
            (typeof valueOf !== "number" || !unplayable.has(valueOf))
        );
    selected.forEach(({ valueOf }) => this.ids.add(valueOf));
    this.songs.splice(index, 0, ...selected);

    if (!infoFlag && !UNBLOCK_MUSIC.enabled) {
      infoFlag = true;
      void window.showInformationMessage(i18n.sentence.hint.noUnplayable);
    }
  }

  private static _clear() {
    this.songs = [];
    this.ids.clear();
  }

  private static _shift(index: number): void {
    if (index === 0) return;
    while (index < 0) index += this.len;
    this.songs.push(...this.songs.splice(0, index));
  }

  getTreeItem(element: QueueContent): QueueContent {
    return element;
  }

  getChildren(): QueueContent[] {
    // TODO only master
    void QueueProvider.context.globalState.update(
      QUEUE_KEY,
      JSON.stringify(QueueProvider.songs.map(({ data }) => data))
    );
    return QueueProvider.songs;
  }
}

export class QueueItemTreeItem extends TreeItem implements PlayTreeItem {
  readonly label!: string;

  readonly description!: string;

  readonly tooltip = this.item.al.name;

  readonly iconPath = new ThemeIcon("zap");

  readonly contextValue = "QueueItemTreeItem";

  readonly command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(public readonly item: SongsItem, public readonly pid: number) {
    super(`${item.name}${item.alia[0] ? ` (${item.alia.join("/")})` : ""}`);
    this.description = this.item.ar.map(({ name }) => name).join("/");
  }

  get valueOf(): number {
    return this.item.id;
  }

  get data(): PlayTreeItemData {
    return {
      id: TreeItemId.queue,
      ctr: [this.item, this.pid],
    };
  }
}
