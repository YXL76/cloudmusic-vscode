import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { QueueItem } from "../constant/type";
import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";
const { unsortInplace } = require("array-unsort");

export class QueueProvider implements TreeDataProvider<QueueItemTreeItem> {
  private static instance: QueueProvider;

  head: QueueItemTreeItem = new QueueItemTreeItem(
    "",
    { name: "", id: 0, bt: 0, alia: "", arName: "" },
    0,
    TreeItemCollapsibleState.None
  );
  islike = false;

  private _onDidChangeTreeData: EventEmitter<
    QueueItemTreeItem | undefined | void
  > = new EventEmitter<QueueItemTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<
    QueueItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private songs: Map<number, QueueItemTreeItem> = new Map<
    number,
    QueueItemTreeItem
  >();

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
    return [...this.songs.values()];
  }

  clear(): void {
    this.songs.clear();
  }

  random(): void {
    const previous = [...this.songs];
    this.songs = new Map(
      [previous[0]].concat(unsortInplace(previous.slice(1)))
    );
  }

  top(element: QueueItemTreeItem): void {
    this.shift([...this.songs.keys()].indexOf(element.item.id));
  }

  shift(index: number): void {
    const previous = [...this.songs];
    while (index < 0) {
      index += previous.length;
    }
    const current = previous.slice(index).concat(previous.slice(0, index));
    this.songs = new Map(current);
    this.head = current[0][1];
    this.islike = AccountManager.likelist.has(this.head.item.id);
    ButtonManager.buttonLike(this.islike);
  }

  add(elements: QueueItemTreeItem[]): void {
    for (const i of elements) {
      this.songs.set(i.item.id, i);
    }
  }

  delete(id: number): void {
    this.songs.delete(id);
  }
}

export class QueueItemTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: QueueItem,
    public readonly pid: number,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return ``;
  }

  get description(): string {
    return this.item.arName;
  }

  iconPath = new ThemeIcon("zap");

  contextValue = "QueueItemTreeItem";
}
