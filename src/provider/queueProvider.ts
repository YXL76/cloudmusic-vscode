import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { SongsItem } from "../constant";
import { lock } from "../state";
import { unsortInplace } from "array-unsort";

export class QueueProvider implements TreeDataProvider<QueueItemTreeItem> {
  private static instance: QueueProvider;

  private _onDidChangeTreeData: EventEmitter<QueueItemTreeItem | void> = new EventEmitter<QueueItemTreeItem | void>();

  readonly onDidChangeTreeData: Event<QueueItemTreeItem | void> = this
    ._onDidChangeTreeData.event;

  private static action?: (instance: QueueProvider) => Promise<void>;
  songs: QueueItemTreeItem[] = [];

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  static refresh(action: (instance: QueueProvider) => Promise<void>): void {
    if (!lock.queue) {
      lock.queue = true;
      QueueProvider.action = action;
      this.instance._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(element: QueueItemTreeItem): TreeItem {
    return element;
  }

  async getChildren(): Promise<QueueItemTreeItem[]> {
    const localAction = QueueProvider.action;
    QueueProvider.action = undefined;
    if (localAction) {
      await localAction(this);
    }
    lock.queue = false;
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
    }
  }

  add(elements: QueueItemTreeItem[]): void {
    const uniqueItems = new Set(this.songs.concat(elements));
    this.songs = [...uniqueItems];
  }

  delete(element: QueueItemTreeItem): void {
    const index = this.songs.indexOf(element);
    if (index >= 0) {
      this.songs.splice(index, 1);
    }
  }
}

export class QueueItemTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: SongsItem,
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
    const arName: string[] = [];
    for (const i of this.item.ar) {
      arName.push(i.name);
    }
    return arName.join("/");
  }

  iconPath = new ThemeIcon("zap");

  contextValue = "QueueItemTreeItem";
}
