import type { Event, TreeDataProvider, TreeItemCollapsibleState } from "vscode";
import { EventEmitter, ThemeIcon, TreeItem } from "vscode";
import type { SongsItem } from "../constant";
import { lock } from "../state";
import { unsortInplace } from "array-unsort";

export class QueueProvider implements TreeDataProvider<QueueItemTreeItem> {
  static songs: QueueItemTreeItem[] = [];

  private static instance: QueueProvider;

  _onDidChangeTreeData: EventEmitter<QueueItemTreeItem | void> = new EventEmitter<QueueItemTreeItem | void>();

  readonly onDidChangeTreeData: Event<QueueItemTreeItem | void> = this
    ._onDidChangeTreeData.event;

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  static async refresh(action: () => Promise<void> | void): Promise<void> {
    if (!lock.queue) {
      lock.queue = true;
      await action();
      this.instance._onDidChangeTreeData.fire();
      lock.queue = false;
    }
  }

  static clear(): void {
    this.songs = [];
  }

  static random(): void {
    this.songs = [this.songs[0]].concat(unsortInplace(this.songs.slice(1)));
  }

  static top(id: number): void {
    this.shift(this.songs.findIndex((value) => value.valueOf() === id));
  }

  static shift(index: number): void {
    if (index) {
      while (index < 0) {
        index += this.songs.length;
      }
      this.songs = this.songs.slice(index).concat(this.songs.slice(0, index));
    }
  }

  static add(elements: QueueItemTreeItem[]): void {
    const raw = this.songs.concat(elements);
    this.songs = [];
    const lookup = {};
    for (const item of raw) {
      const hashed = item.valueOf();
      if (!lookup[hashed]) {
        this.songs.push(item);
        lookup[hashed] = true;
      }
    }
  }

  static delete(id: number): void {
    const index = this.songs.findIndex((value) => value.valueOf() === id);
    if (index >= 0) {
      this.songs.splice(index, 1);
    }
  }

  getTreeItem(element: QueueItemTreeItem): TreeItem {
    return element;
  }

  getChildren(): QueueItemTreeItem[] {
    return QueueProvider.songs;
  }
}

export class QueueItemTreeItem extends TreeItem {
  description = (() => {
    const arName: string[] = [];
    for (const i of this.item.ar) {
      arName.push(i.name);
    }
    return arName.join("/");
  })();

  iconPath = new ThemeIcon("zap");

  contextValue = "QueueItemTreeItem";

  constructor(
    public readonly label: string,
    public readonly item: SongsItem,
    public readonly pid: number,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf(): number {
    return this.item.id;
  }
}
