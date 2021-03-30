import { EventEmitter, ThemeIcon, TreeItem, window } from "vscode";
import type { LocalFileTreeItem, ProgramTreeItem } from ".";
import { UNBLOCK_MUSIC, unplayable } from "../constant";
import type { SongsItem } from "../constant";
import type { TreeDataProvider } from "vscode";
import i18n from "../i18n";
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

let infoFlag = false;

export class QueueProvider implements TreeDataProvider<QueueContent> {
  private static lock = false;

  private static songs: QueueContent[] = [];

  private static instance: QueueProvider;

  private static readonly ids = new Set<string | number>();

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
    this.songs = [this.songs[0], ...unsortInplace(this.songs.slice(1))];
  }

  static top(id: number | string): void {
    this.shift(this.songs.findIndex((value) => value.valueOf === id));
  }

  static shift(index: number): void {
    if (index) {
      while (index < 0) index += this.len;
      this.songs.push(...this.songs.splice(0, index));
    }
  }

  static add(elements: QueueContent[], index: number = this.len): void {
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

  static delete(id: number | string): void {
    const index = this.songs.findIndex((value) => value.valueOf === id);
    if (index >= 0)
      this.songs
        .splice(index, 1)
        .forEach(({ valueOf }) => this.ids.delete(valueOf));
  }

  static playNext(elements: QueueContent[]): void {
    const headValue = this.head?.valueOf;
    if (elements.length > 1) {
      const index = elements.findIndex((value) => value.valueOf === headValue);
      if (index > 0) elements.splice(index, 1);
      for (const i of elements) this.ids.delete(i.valueOf);
      this.songs = this.songs.filter(({ valueOf }) => this.ids.has(valueOf));
    } else {
      if (elements[0].valueOf === headValue) return;
      this.delete(elements[0].valueOf);
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

  get valueOf(): number {
    return this.item.id;
  }
}
