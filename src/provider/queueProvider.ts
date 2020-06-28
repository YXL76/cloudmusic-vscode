import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { join } from "path";
import { PlaylistContentTreeItem } from "./playlistProvider";
import { PlaylistContent } from "../constant/type";
const { unsortInplace } = require("array-unsort");

export class QueueProvider implements TreeDataProvider<QueueTreeItem> {
  private static instance: QueueProvider;

  private _onDidChangeTreeData: EventEmitter<
    QueueTreeItem | undefined | void
  > = new EventEmitter<QueueTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<QueueTreeItem | undefined | void> = this
    ._onDidChangeTreeData.event;

  public songs: Map<number, QueueTreeItem> = new Map<number, QueueTreeItem>();

  constructor() {}

  static getInstance(): QueueProvider {
    return this.instance
      ? this.instance
      : (this.instance = new QueueProvider());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: QueueTreeItem): TreeItem {
    return element;
  }

  async getChildren(_element?: QueueTreeItem): Promise<QueueTreeItem[]> {
    return [...this.songs.values()];
  }

  clear() {
    this.songs.clear();
  }

  random() {
    this.songs = new Map(unsortInplace([...this.songs]));
  }

  shift(element: QueueTreeItem) {
    const index = [...this.songs.keys()].indexOf(element.item.id);
    if (index !== 0) {
      const previous = [...this.songs];
      const current = previous.slice(index).concat(previous.slice(0, index));
      this.songs = new Map(current);
    }
  }

  add(elements: PlaylistContentTreeItem[]) {
    for (const i of elements) {
      this.songs.set(i.item.id, i.toQueueTreeItem());
    }
  }

  delete(id: number) {
    this.songs.delete(id);
  }

  play(element: QueueTreeItem) {
    this.shift(element);
  }
}

export class QueueTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: PlaylistContent,
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

  iconPath = {
    light: join(__filename, "../../..", "resources", "light", "music.svg"),
    dark: join(__filename, "../../..", "resources", "dark", "music.svg"),
  };

  contextValue = "QueueTreeItem";
}
