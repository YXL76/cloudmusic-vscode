import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import type { LocalFileTreeItem, ProgramTreeItem } from ".";
import type { SongsItem } from "../constant";
import type { TreeDataProvider } from "vscode";
import { unsortInplace } from "array-unsort";

export const enum QueueSortType {
  song,
  album,
  artist,
}

export type QueueContent =
  | QueueItemTreeItem
  | LocalFileTreeItem
  | ProgramTreeItem;

export class QueueProvider implements TreeDataProvider<QueueContent> {
  private static lock = false;

  private static songs: QueueContent[] = [];

  private static instance: QueueProvider;

  private static ids: Set<string | number> = new Set();

  _onDidChangeTreeData = new EventEmitter<QueueContent | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  static refresh(action: () => void): void {
    if (!this.lock) {
      this.lock = true;
      action();
      this.instance._onDidChangeTreeData.fire();
      this.lock = false;
    }
  }

  static get len(): number {
    return this.songs.length;
  }

  static get head(): QueueContent | undefined {
    return this.songs[0];
  }

  static get next(): QueueContent | undefined {
    return this.songs[1];
  }

  static clear(): void {
    this.songs = [];
    this.ids.clear();
  }

  static random(): void {
    this.songs = [this.songs[0]].concat(unsortInplace(this.songs.slice(1)));
  }

  static top(id: number | string): void {
    this.shift(this.songs.findIndex((value) => value.valueOf() === id));
  }

  static shift(index: number): void {
    if (index) {
      while (index < 0) index += this.len;
      this.songs = this.songs.slice(index).concat(this.songs.slice(0, index));
    }
  }

  static add(elements: QueueContent[], index: number = this.len): void {
    const selected = [];
    for (const i of elements) {
      if (!this.ids.has(i.valueOf())) {
        selected.push(i);
        this.ids.add(i.valueOf());
      }
    }
    this.songs.splice(index, 0, ...selected);
  }

  static delete(id: number | string): void {
    const index = this.songs.findIndex((value) => value.valueOf() === id);
    if (index >= 0)
      this.songs
        .splice(index, 1)
        .forEach((item) => this.ids.delete(item.valueOf()));
  }

  static playNext(elements: QueueContent[]): void {
    const headValue = this.head?.valueOf();
    if (elements.length > 1) {
      const index = elements.findIndex(
        (value) => value.valueOf() === headValue
      );
      if (index > 0) elements.splice(index, 1);
      for (const i of elements) this.ids.delete(i.valueOf());
      const songs = [];
      for (const i of this.songs) if (this.ids.has(i.valueOf())) songs.push(i);
      this.songs = songs;
    } else {
      if (elements[0].valueOf() === headValue) return;
      this.delete(elements[0].valueOf());
    }
    this.add(elements, 1);
  }

  static sort(type: QueueSortType): void {
    switch (type) {
      case QueueSortType.song:
        QueueProvider.songs.sort((a, b) => a.label.localeCompare(b.label));
        break;
      case QueueSortType.album:
        QueueProvider.songs.sort((a, b) =>
          a.item.al.name.localeCompare(b?.item.al.name)
        );
        break;
      case QueueSortType.artist:
        QueueProvider.songs.sort((a, b) =>
          a.item.ar[0].name.localeCompare(b.item.ar[0].name)
        );
    }
  }

  static reverse(): void {
    this.songs.reverse();
  }

  getTreeItem(element: QueueContent): QueueContent {
    return element;
  }

  getChildren(): QueueContent[] {
    return QueueProvider.songs;
  }
}

export class QueueItemTreeItem extends TreeItem {
  readonly label!: string;

  readonly description = (() =>
    this.item.ar.map(({ name }) => name).join("/"))();

  readonly iconPath = new ThemeIcon("zap");

  readonly contextValue = "QueueItemTreeItem";

  readonly command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(public readonly item: SongsItem, public readonly pid: number) {
    super(`${item.name}${item.alia[0] ? ` (${item.alia.join("/")})` : ""}`);
  }

  valueOf(): number {
    return this.item.id;
  }
}
