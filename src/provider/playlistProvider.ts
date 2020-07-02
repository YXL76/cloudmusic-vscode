import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { QueueProvider, QueueItemTreeItem } from "./queueProvider";
import { QueueItem, PlaylistItem } from "../constant/type";
import { AccountManager } from "../manager/accountManager";
import { PlaylistManager } from "../manager/playlistManager";

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  private static instance: PlaylistProvider;

  private _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  > = new EventEmitter<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private queueProvider: QueueProvider = QueueProvider.getInstance();

  private treeView: Map<number, QueueItemTreeItem[]> = new Map<
    number,
    QueueItemTreeItem[]
  >();

  constructor() {}

  static getInstance(): PlaylistProvider {
    return this.instance || (this.instance = new PlaylistProvider());
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

  getTreeItem(element: PlaylistItemTreeItem | QueueItemTreeItem): TreeItem {
    return element;
  }

  async getChildren(
    element?: PlaylistItemTreeItem | QueueItemTreeItem
  ): Promise<PlaylistItemTreeItem[] | QueueItemTreeItem[]> {
    return element
      ? await this.getPlaylistContent(element.item.id)
      : await this.getPlaylistItem();
  }

  private async QueueItem2PlaylistContentTreeItem(
    id: number,
    songs: QueueItem[]
  ): Promise<QueueItemTreeItem[]> {
    const ids: number[] = songs.map((song) => song.id);
    const urls = await PlaylistManager.trackUrls(ids);
    let ret: QueueItemTreeItem[] = [];
    for (let i = 0; i < songs.length; ++i) {
      const song = songs[i];
      if (urls[i]) {
        ret.push(
          new QueueItemTreeItem(
            `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
            song,
            id,
            TreeItemCollapsibleState.None
          )
        );
      }
    }
    return ret;
  }

  private async getPlaylistContent(id: number): Promise<QueueItemTreeItem[]> {
    const items = this.treeView.get(id);
    if (items) {
      return items;
    } else {
      const songs = await PlaylistManager.tracks(id);
      const ret = await this.QueueItem2PlaylistContentTreeItem(id, songs);
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
  ): Promise<QueueItemTreeItem[]> {
    const songs = await PlaylistManager.tracksIntelligence(id, pid);
    return await this.QueueItem2PlaylistContentTreeItem(id, songs);
  }

  async playPlaylist(
    id: number,
    index?: QueueItemTreeItem,
    callback?: Function
  ) {
    this.queueProvider.clear();
    this.queueProvider.add(await this.getPlaylistContent(id));
    if (index) {
      this.queueProvider.top(index, callback);
    }
    this.queueProvider.refresh();
  }

  async addPlaylist(id: number) {
    this.queueProvider.add(await this.getPlaylistContent(id));
    this.queueProvider.refresh();
  }

  async intelligence(element: QueueItemTreeItem) {
    this.queueProvider.clear();
    this.queueProvider.add([element]);
    this.queueProvider.add(
      await this.getPlaylistContentIntelligence(element.item.id, element.pid)
    );
    this.queueProvider.refresh();
  }

  addSong(element: QueueItemTreeItem) {
    this.queueProvider.add([element]);
    this.queueProvider.refresh();
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
    ${description || ""}
    ${trackCount}
    ${playCount}
    ${subscribedCount}
    `;
  }

  iconPath = new ThemeIcon("selection");

  contextValue = "PlaylistItemTreeItem";
}
