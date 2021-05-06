import { EventEmitter, ThemeIcon, TreeItem, window } from "vscode";
import type { ExtensionContext, TreeDataProvider } from "vscode";
import { LocalFileTreeItem, ProgramTreeItem } from ".";
import type { PlayTreeItem, PlayTreeItemData, QueueContent } from ".";
import { TreeItemId, UNBLOCK_MUSIC, unplayable } from "../constant";
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

export class QueueProvider implements TreeDataProvider<QueueContent> {
  private static songs: QueueContent[] = [];

  private static instance: QueueProvider;

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

  static random(): PlayTreeItemData[] {
    const [head, ...rest] = this.songs;
    return head
      ? [head.data, ...unsortInplace(rest.map(({ data }) => data))]
      : [];
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
    if (index >= 0) this.songs.splice(index, 1);

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
            ? ({ item: { al: a } }, { item: { al: b } }) =>
                a.name.localeCompare(b.name)
            : ({ item: { al: a } }, { item: { al: b } }) =>
                b.name.localeCompare(a.name)
        );
        break;
      case QueueSortType.artist:
        this.songs.sort(
          order === QueueSortOrder.ascending
            ? ({ item: { ar: a } }, { item: { ar: b } }) =>
                a?.[0].name.localeCompare(b?.[0].name)
            : ({ item: { ar: a } }, { item: { ar: b } }) =>
                b?.[0].name.localeCompare(a?.[0].name)
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
      switch (item.itemType) {
        case TreeItemId.local:
          return LocalFileTreeItem.new(item.filename, item.ext, item.path);
        case TreeItemId.program:
          return ProgramTreeItem.new(item);
        default:
          return QueueItemTreeItem.new(item);
      }
    });
  }

  private static _add(
    elements: QueueContent[],
    index: number = this.len
  ): void {
    if (UNBLOCK_MUSIC.enabled)
      elements = elements.filter(
        ({ valueOf }) => typeof valueOf !== "number" || !unplayable.has(valueOf)
      );

    this.songs.splice(index, 0, ...elements);
    this.songs = [...new Set(this.songs)];

    if (!UNBLOCK_MUSIC.enabled)
      void window.showInformationMessage(i18n.sentence.hint.noUnplayable);
  }

  private static _clear() {
    this.songs = [];
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
    return QueueProvider.songs;
  }
}

export type QueueItemTreeItemData = SongsItem & {
  pid: number;
  itemType: TreeItemId.queue;
};

export class QueueItemTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<number, QueueItemTreeItem>();

  readonly label!: string;

  readonly description = this.data.ar.map(({ name }) => name).join("/");

  readonly tooltip = this.data.al.name;

  readonly iconPath = new ThemeIcon("zap");

  readonly contextValue = "QueueItemTreeItem";

  readonly item = this.data;

  readonly command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(readonly data: QueueItemTreeItemData) {
    super(`${data.name}${data.alia[0] ? ` (${data.alia.join("/")})` : ""}`);
  }

  get valueOf(): number {
    return this.data.id;
  }

  static new(data: Omit<QueueItemTreeItemData, "itemType">): QueueItemTreeItem {
    let element = this._set.get(data.id);
    if (element) {
      if (element.data.pid === 0) element.data.pid = data.pid;
      return element;
    }
    element = new this({ ...data, itemType: TreeItemId.queue });
    this._set.set(data.id, element);
    return element;
  }
}
