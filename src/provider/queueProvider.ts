import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { isLike } from "../state/like";
import { QueueItem } from "../constant/type";
import { AccountManager } from "../manager/accountManager";
const { unsortInplace } = require("array-unsort");

export class QueueProvider implements TreeDataProvider<QueueItemTreeItem> {
  private static instance: QueueProvider;

  private _onDidChangeTreeData: EventEmitter<
    QueueItemTreeItem | undefined | void
  > = new EventEmitter<QueueItemTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<
    QueueItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  songs: QueueItemTreeItem[] = [];

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: QueueItemTreeItem): TreeItem {
    return element;
  }

  getChildren(): QueueItemTreeItem[] {
    return this.songs;
  }

  clear(): void {
    this.songs = [];
  }

  random(): void {
    this.songs = [this.songs[0]].concat(unsortInplace(this.songs.slice(1)));
  }

  top(element: QueueItemTreeItem): void {
    this.shift(this.songs.indexOf(element));
  }

  shift(index: number): void {
    if (index) {
      while (index < 0) {
        index += this.songs.length;
      }
      this.songs = this.songs.slice(index).concat(this.songs.slice(0, index));
      isLike.set(AccountManager.likelist.has(this.songs[0].item.id));
    }
  }

  add(elements: QueueItemTreeItem[]): void {
    const uniqueItems = new Set(this.songs.concat(elements));
    this.songs = [...uniqueItems];
  }

  delete(element: QueueItemTreeItem): void {
    const index = this.songs.indexOf(element);
    this.songs = this.songs.slice(0, index).concat(this.songs.slice(index + 1));
  }
}

export class QueueItemTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: QueueItem,
    public readonly pid: number,
    public readonly md5: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf(): number {
    return this.item.id;
  }

  get description(): string {
    return this.item.arName;
  }

  iconPath = new ThemeIcon("zap");

  contextValue = "QueueItemTreeItem";
}
