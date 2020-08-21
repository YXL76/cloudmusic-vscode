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

  private static action?: () => Promise<void>;
  static songs: QueueItemTreeItem[] = [];

  static getInstance(): QueueProvider {
    return this.instance || (this.instance = new QueueProvider());
  }

  static refresh(action: () => Promise<void>): void {
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
      await localAction();
    }
    lock.queue = false;
    return QueueProvider.songs;
  }

  static clear(): void {
    QueueProvider.songs = [];
  }

  static random(): void {
    QueueProvider.songs = [QueueProvider.songs[0]].concat(
      unsortInplace(QueueProvider.songs.slice(1))
    );
  }

  static shift(index: number): void {
    if (index) {
      while (index < 0) {
        index += QueueProvider.songs.length;
      }
      QueueProvider.songs = QueueProvider.songs
        .slice(index)
        .concat(QueueProvider.songs.slice(0, index));
    }
  }

  static add(elements: QueueItemTreeItem[]): void {
    const uniqueItems = new Set(QueueProvider.songs.concat(elements));
    QueueProvider.songs = [...uniqueItems];
  }

  static delete(element: QueueItemTreeItem): void {
    const index = QueueProvider.songs.indexOf(element);
    if (index >= 0) {
      QueueProvider.songs.splice(index, 1);
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
