import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import { LocalFileTreeItem, ProgramTreeItem } from ".";
import type { PlayTreeItem, PlayTreeItemData, QueueContent } from ".";
import type { NeteaseTypings } from "api";
import type { TreeDataProvider } from "vscode";
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
  private static _songs: PlayTreeItemData[] = [];

  private static _instance: QueueProvider;

  _onDidChangeTreeData = new EventEmitter<QueueContent | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): QueueProvider {
    return this._instance || (this._instance = new QueueProvider());
  }

  static get len(): number {
    return this._songs.length;
  }

  static get head(): QueueContent | undefined {
    return this._songs?.[0] ? this._parseRaw(this._songs[0]) : undefined;
  }

  static get next(): QueueContent | undefined {
    return this._songs?.[1] ? this._parseRaw(this._songs[1]) : undefined;
  }

  static get songs(): PlayTreeItemData[] {
    return this._songs;
  }

  static random(): PlayTreeItemData[] {
    const [head, ...rest] = this._songs;
    return head ? [head, ...unsortInplace(rest)] : [];
  }

  static new(elements: PlayTreeItemData[], id?: number): void {
    this._clear();
    this._add(elements);

    id ? this.top(id) : this._instance._onDidChangeTreeData.fire();
  }

  static clear(): void {
    this._clear();

    this._instance._onDidChangeTreeData.fire();
  }

  static top(that: number | string): void {
    this.shift(this._songs.findIndex(({ id }) => that === id));
  }

  static shift(index: number): void {
    this._shift(index);

    this._instance._onDidChangeTreeData.fire();
  }

  static add(elements: PlayTreeItemData[], index: number = this.len): void {
    this._add(elements, index);

    this._instance._onDidChangeTreeData.fire();
  }

  static delete(that: number | string): void {
    const index = this._songs.findIndex(({ id }) => that === id);
    if (index >= 0) this._songs.splice(index, 1);

    this._instance._onDidChangeTreeData.fire();
  }

  static sort(type: QueueSortType, order: QueueSortOrder): PlayTreeItemData[] {
    const getName = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
          return item.name;
        case "p":
          return item.mainSong.name;
        case "l":
          return item.filename;
      }
    };
    const getAlbum = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
          return item.al.name;
        case "p":
          return item.mainSong.al.name;
        case "l":
          return item.ext ?? "";
      }
    };
    const getArtist = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
          return item.ar?.[0].name ?? "";
        case "p":
          return item.mainSong.ar?.[0].name ?? "";
        case "l":
          return "";
      }
    };

    switch (type) {
      case QueueSortType.song:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getName(a).localeCompare(getName(b))
            : (a, b) => getName(b).localeCompare(getName(a))
        );
        break;
      case QueueSortType.album:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getAlbum(a).localeCompare(getAlbum(b))
            : (a, b) => getAlbum(b).localeCompare(getAlbum(a))
        );
        break;
      case QueueSortType.artist:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getArtist(a).localeCompare(getArtist(b))
            : (a, b) => getArtist(b).localeCompare(getArtist(a))
        );
    }
    return this._songs;
  }

  private static _parseRaw(item: PlayTreeItemData): QueueContent {
    switch (item.itemType) {
      case "q":
        return QueueItemTreeItem.new(item);
      case "p":
        return ProgramTreeItem.new(item);
      default:
        return LocalFileTreeItem.new(item);
    }
  }

  private static _add(
    elements: PlayTreeItemData[],
    index: number = this.len
  ): void {
    this._songs.splice(index, 0, ...elements);
    this._songs = [...new Set(this._songs.map((i) => this._parseRaw(i)))].map(
      ({ data }) => data
    );
  }

  private static _clear() {
    this._songs = [];
  }

  private static _shift(index: number): void {
    if (index === 0) return;
    while (index < 0) index += this.len;
    this._songs.push(...this._songs.splice(0, index));
  }

  getTreeItem(element: QueueContent): QueueContent {
    return element;
  }

  getChildren(): QueueContent[] {
    return QueueProvider._songs.map((i) => QueueProvider._parseRaw(i));
  }
}

export type QueueItemTreeItemData = NeteaseTypings.SongsItem & {
  pid: number;
  itemType: "q";
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
    element = new this({ ...data, itemType: "q" });
    this._set.set(data.id, element);
    return element;
  }
}
