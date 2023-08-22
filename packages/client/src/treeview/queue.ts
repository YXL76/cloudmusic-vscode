import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import { LocalFileTreeItem, ProgramTreeItem } from "./index.js";
import type { PlayTreeItem, PlayTreeItemData, QueueContent } from "./index.js";
import type { TreeDataProvider, TreeView } from "vscode";
import type { NeteaseTypings } from "api";
import { shuffle } from "lodash";

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
  static id = -1;

  private static _songs: PlayTreeItemData[] = [];

  private static _instance: QueueProvider;

  readonly view!: TreeView<QueueContent>;

  _onDidChangeTreeData = new EventEmitter<QueueContent | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static get len(): number {
    return this._songs.length;
  }

  static get head(): QueueContent | undefined {
    return this._songs?.[0] ? this._parseRaw(this._songs[0]) : undefined;
  }

  static get next(): QueueContent | undefined {
    return this._songs?.[1] ? this._parseRaw(this._songs[1]) : undefined;
  }

  static get songs(): readonly PlayTreeItemData[] {
    return this._songs;
  }

  static getInstance(): QueueProvider {
    return this._instance || (this._instance = new QueueProvider());
  }

  static random(): readonly PlayTreeItemData[] {
    const [head, ...rest] = this._songs;
    return head ? [head, ...shuffle(rest)] : [];
  }

  static new(elements: readonly PlayTreeItemData[], id = this.id + 1): void {
    if (this.id === id) return;
    this.id = id;
    this._clear();
    this._add(elements);

    this._instance._onDidChangeTreeData.fire();
  }

  static clear(): void {
    this._clear();

    this._instance._onDidChangeTreeData.fire();
  }

  static top(that: number | string): void {
    const index = this._songs.findIndex((i) => that === this._parseRaw(i).valueOf);
    if (index > 0) this.shift(index);
  }

  static shift(index: number): void {
    this._shift(index);

    this._instance._onDidChangeTreeData.fire();
  }

  static add(elements: readonly PlayTreeItemData[], index: number = this.len): void {
    this._add(elements, index);

    this._instance._onDidChangeTreeData.fire();
  }

  static delete(that: number | string): void {
    const index = this._songs.findIndex((i) => that === this._parseRaw(i).valueOf);
    if (index >= 0) this._songs.splice(index, 1);

    this._instance._onDidChangeTreeData.fire();
  }

  static sort(type: QueueSortType, order: QueueSortOrder): readonly PlayTreeItemData[] {
    const getName = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
        case "l":
          return item.name;
        case "p":
          return item.mainSong.name;
      }
    };
    const getAlbum = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
        case "l":
          return item.al.name;
        case "p":
          return item.mainSong.al.name;
      }
    };
    const getArtist = (item: PlayTreeItemData): string => {
      switch (item.itemType) {
        case "q":
        case "l":
          return item.ar?.[0].name ?? "";
        case "p":
          return item.mainSong.ar?.[0].name ?? "";
      }
    };

    switch (type) {
      case QueueSortType.song:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getName(a).localeCompare(getName(b))
            : (a, b) => getName(b).localeCompare(getName(a)),
        );
        break;
      case QueueSortType.album:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getAlbum(a).localeCompare(getAlbum(b))
            : (a, b) => getAlbum(b).localeCompare(getAlbum(a)),
        );
        break;
      case QueueSortType.artist:
        this._songs.sort(
          order === QueueSortOrder.ascending
            ? (a, b) => getArtist(a).localeCompare(getArtist(b))
            : (a, b) => getArtist(b).localeCompare(getArtist(a)),
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

  private static _add(elements: readonly PlayTreeItemData[], index: number = this.len): void {
    this._songs.splice(index, 0, ...elements);
    this._songs = [...new Set(this._songs.map((i) => this._parseRaw(i)))].map(({ data }) => data);
  }

  private static _clear() {
    this._songs = [];
  }

  private static _shift(index: number): void {
    // Allow replay current playing song
    // if (index === 0) return;
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

  declare readonly label: string;

  override readonly description: string;

  override readonly tooltip: string;

  override readonly iconPath = new ThemeIcon("zap");

  override readonly contextValue = "QueueItemTreeItem";

  override readonly command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(readonly data: QueueItemTreeItemData) {
    super(`${data.name}${data.alia[0] ? ` (${data.alia.join("/")})` : ""}`);

    this.description = data.ar.map(({ name }) => name).join("/");
    this.tooltip = data.al.name;
  }

  override get valueOf(): number {
    return this.data.id;
  }

  static new(data: QueueItemTreeItemData): QueueItemTreeItem {
    let element = this._set.get(data.id);
    if (element) {
      if (data.pid) element.data.pid = data.pid;
      return element;
    }
    element = new this(data);
    this._set.set(data.id, element);
    return element;
  }
}
