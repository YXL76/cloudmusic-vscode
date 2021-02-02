import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import type { LocalFileTreeItem, ProgramTreeItem } from ".";
import type { SongsItem } from "../constant";
import type { TreeDataProvider } from "vscode";
import { unsortInplace } from "array-unsort";

export class QueueProvider
  implements
    TreeDataProvider<QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem> {
  static lock = false;

  static songs: (
    | QueueItemTreeItem
    | LocalFileTreeItem
    | ProgramTreeItem
  )[] = [];

  private static instance: QueueProvider;

  _onDidChangeTreeData = new EventEmitter<
    QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance() {
    return this.instance || (this.instance = new QueueProvider());
  }

  static refresh(action: () => void) {
    if (!this.lock) {
      this.lock = true;
      action();
      this.instance._onDidChangeTreeData.fire();
      this.lock = false;
    }
  }

  static clear() {
    this.songs = [];
  }

  static random() {
    this.songs = [this.songs[0]].concat(unsortInplace(this.songs.slice(1)));
  }

  static top(id: number | string) {
    this.shift(this.songs.findIndex((value) => value.valueOf() === id));
  }

  static shift(index: number) {
    if (index) {
      while (index < 0) {
        index += this.songs.length;
      }
      this.songs = this.songs.slice(index).concat(this.songs.slice(0, index));
    }
  }

  static add(
    elements: (QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem)[]
  ) {
    const raw = this.songs.concat(elements);
    this.songs = [];
    const lookup = new Set<string | number>();
    for (const item of raw) {
      const value = item.valueOf();
      if (!lookup.has(value)) {
        this.songs.push(item);
        lookup.add(value);
      }
    }
  }

  static delete(id: number | string) {
    const index = this.songs.findIndex((value) => value.valueOf() === id);
    if (index >= 0) {
      this.songs.splice(index, 1);
    }
  }

  getTreeItem(
    element: QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem
  ) {
    return element;
  }

  getChildren() {
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

  valueOf() {
    return this.item.id;
  }
}
