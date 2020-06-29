import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { join } from "path";
import { QueueProvider, QueueItemTreeItem } from "./queueProvider";
import { QueueItem, PlaylistItem } from "../constant/type";
import { AccountManager } from "../manager/accountManager";
import { PlaylistManager } from "../manager/playlistManager";

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | PlaylistContentTreeItem> {
  private static instance: PlaylistProvider;

  private _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  > = new EventEmitter<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private queueProvider: QueueProvider = QueueProvider.getInstance();

  private treeView: Map<number, PlaylistContentTreeItem[]> = new Map<
    number,
    PlaylistContentTreeItem[]
  >();

  constructor() {}

  static getInstance(): PlaylistProvider {
    return this.instance
      ? this.instance
      : (this.instance = new PlaylistProvider());
  }

  refresh(element?: PlaylistItemTreeItem): void {
    if (element) {
      this.treeView.delete(element.item.id);
      this._onDidChangeTreeData.fire(element);
    } else {
      this.treeView.clear();
      this._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(
    element: PlaylistItemTreeItem | PlaylistContentTreeItem
  ): TreeItem {
    return element;
  }

  async getChildren(
    element?: PlaylistItemTreeItem | PlaylistContentTreeItem
  ): Promise<PlaylistItemTreeItem[] | PlaylistContentTreeItem[]> {
    return element
      ? await this.getPlaylistContent(element.item.id)
      : await this.getPlaylistItem();
  }

  private async getPlaylistContent(
    id: number
  ): Promise<PlaylistContentTreeItem[]> {
    const items = this.treeView.get(id);
    if (items) {
      return items;
    } else {
      const songs = await PlaylistManager.tracks(id);
      const ret = songs.map((song) => {
        return new PlaylistContentTreeItem(
          `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
          song,
          id,
          TreeItemCollapsibleState.None
        );
      });
      this.treeView.set(id, ret);
      return ret;
    }
  }

  private async getPlaylistItem(): Promise<PlaylistItemTreeItem[]> {
    const playlists = await AccountManager.playlist();
    return playlists.map((playlist) => {
      return new PlaylistItemTreeItem(
        playlist.name,
        playlist,
        TreeItemCollapsibleState.Collapsed
      );
    });
  }

  private async getPlaylistContentIntelligence(
    id: number,
    pid: number
  ): Promise<PlaylistContentTreeItem[]> {
    const songs = await PlaylistManager.tracksIntelligence(id, pid);
    return songs.map((song) => {
      return new PlaylistContentTreeItem(
        `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
        song,
        id,
        TreeItemCollapsibleState.None
      );
    });
  }

  async playPlaylist(id: number, index?: PlaylistContentTreeItem) {
    this.queueProvider.clear();
    this.queueProvider.add(await this.getPlaylistContent(id));
    if (index) {
      this.queueProvider.top(index.toQueueTreeItem());
    }
    this.queueProvider.refresh();
  }

  async addPlaylist(id: number) {
    this.queueProvider.add(await this.getPlaylistContent(id));
    this.queueProvider.refresh();
  }

  async intelligence(element: PlaylistContentTreeItem) {
    this.queueProvider.clear();
    this.queueProvider.add([element]);
    this.queueProvider.add(
      await this.getPlaylistContentIntelligence(element.item.id, element.pid)
    );
    this.queueProvider.refresh();
  }

  addSong(element: PlaylistContentTreeItem) {
    this.queueProvider.add([element]);
    this.queueProvider.refresh();
  }

  async playSongWithPlaylist(element: PlaylistContentTreeItem) {
    this.queueProvider.clear();
    await this.playPlaylist(element.pid, element);
  }
}

export class PlaylistItemTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: PlaylistItem,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    const { description, playCount, subscribedCount, trackCount } = this.item;
    return `
    ${description ? description : ""}
    ${trackCount}
    ${playCount}
    ${subscribedCount}
    `;
  }

  iconPath = {
    light: join(__filename, "../../..", "resources", "light", "list.svg"),
    dark: join(__filename, "../../..", "resources", "dark", "list.svg"),
  };

  contextValue = "PlaylistItemTreeItem";
}

export class PlaylistContentTreeItem extends QueueItemTreeItem {
  constructor(
    public readonly label: string,
    public readonly item: QueueItem,
    public readonly pid: number,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, item, collapsibleState);
  }

  toQueueTreeItem(): QueueItemTreeItem {
    return new QueueItemTreeItem(this.label, this.item, this.collapsibleState);
  }

  contextValue = "PlaylistContentTreeItem";
}
