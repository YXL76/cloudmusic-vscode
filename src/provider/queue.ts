import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import type { TreeDataProvider, TreeItemCollapsibleState } from "vscode";
import type { LocalFileTreeItem } from ".";
import type { SongsItem } from "../constant";
import { unsortInplace } from "array-unsort";

export class QueueProvider
  implements TreeDataProvider<QueueItemTreeItem | LocalFileTreeItem> {
  static lock = false;

  static songs: (QueueItemTreeItem | LocalFileTreeItem)[] = [];

  private static instance: QueueProvider;

  _onDidChangeTreeData = new EventEmitter<QueueItemTreeItem | void>();

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

  static add(elements: (QueueItemTreeItem | LocalFileTreeItem)[]) {
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

  getTreeItem(element: QueueItemTreeItem | LocalFileTreeItem) {
    return element;
  }

  getChildren() {
    return QueueProvider.songs;
  }
}

export class QueueItemTreeItem extends TreeItem {
  description = (() => this.item.ar.map(({ name }) => name).join("/"))();

  iconPath = new ThemeIcon("zap");

  contextValue = "QueueItemTreeItem";

  command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(
    public readonly label: string,
    public readonly item: SongsItem,
    public readonly pid: number,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf() {
    return this.item.id;
  }
}
