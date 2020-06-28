import { Event, EventEmitter, TreeDataProvider, TreeItem } from "vscode";
import { PlaylistContentTreeItem } from "./playlistProvider";
const { unsortInplace } = require("array-unsort");

export class QueueProvider
  implements TreeDataProvider<PlaylistContentTreeItem> {
  private static instance: QueueProvider;

  private _onDidChangeTreeData: EventEmitter<
    PlaylistContentTreeItem | undefined | void
  > = new EventEmitter<PlaylistContentTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<
    PlaylistContentTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  public songs: Map<number, PlaylistContentTreeItem> = new Map<
    number,
    PlaylistContentTreeItem
  >();

  constructor() {}

  static getInstance(): QueueProvider {
    return this.instance
      ? this.instance
      : (this.instance = new QueueProvider());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PlaylistContentTreeItem): TreeItem {
    return element;
  }

  async getChildren(
    _element?: PlaylistContentTreeItem
  ): Promise<PlaylistContentTreeItem[]> {
    return [...this.songs.values()];
  }

  clear() {
    this.songs.clear();
    this.refresh();
  }

  random() {
    this.songs = new Map(unsortInplace([...this.songs]));
    this.refresh();
  }

  shift(index: number) {
    const previous = [...this.songs];
    const current = previous.slice(index).concat(previous.slice(0, index));
    this.songs = new Map(current);
    this.refresh();
  }

  add(element: PlaylistContentTreeItem) {
    this.songs.set(element.item.id, element);
    this.refresh();
  }

  adds(elements: PlaylistContentTreeItem[]) {
    for (const i of elements) {
      this.songs.set(i.item.id, i);
    }
    this.refresh();
  }

  play(element: PlaylistContentTreeItem) {
    this.shift([...this.songs.keys()].indexOf(element.item.id));
  }
}
