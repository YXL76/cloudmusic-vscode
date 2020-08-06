import * as nls from "vscode-nls";
import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { QueueProvider, QueueItemTreeItem } from "./queueProvider";
import { PlaylistItem } from "../constant/type";
import { AccountManager } from "../manager/accountManager";
import {
  songsItem2TreeItem,
  getPlaylistContentIntelligence,
} from "../util/util";
import { apiPlaylistDetail, apiSongDetail } from "../util/api";

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

const queueProvider = QueueProvider.getInstance();

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  private static userInstance: PlaylistProvider;
  private static favoriteInstance: PlaylistProvider;

  private _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  > = new EventEmitter<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | QueueItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private static belongsTo: Map<number, number> = new Map<number, number>();
  private static treeView: Map<number, QueueItemTreeItem[]> = new Map<
    number,
    QueueItemTreeItem[]
  >();

  constructor(private type: number) {}

  static getUserInstance(): PlaylistProvider {
    return this.userInstance || (this.userInstance = new PlaylistProvider(1));
  }

  static getFavoriteInstance(): PlaylistProvider {
    return (
      this.favoriteInstance || (this.favoriteInstance = new PlaylistProvider(2))
    );
  }

  static refresh(element?: PlaylistItemTreeItem): void {
    if (element) {
      this.treeView.delete(element.item.id);
      const type = this.belongsTo.get(element.item.id);
      if (type) {
        if (type === 1) {
          this.userInstance._onDidChangeTreeData.fire(element);
        } else {
          this.favoriteInstance._onDidChangeTreeData.fire(element);
        }
      }
    } else {
      this.belongsTo.clear();
      this.treeView.clear();
      this.userInstance._onDidChangeTreeData.fire();
      this.favoriteInstance._onDidChangeTreeData.fire();
    }
  }

  refresh(element?: PlaylistItemTreeItem): void {
    if (element) {
      this._onDidChangeTreeData.fire(element);
    } else {
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
      ? await PlaylistProvider.getPlaylistContent(element.item.id)
      : await this.getPlaylistItem();
  }

  private static async getPlaylistContent(
    id: number
  ): Promise<QueueItemTreeItem[]> {
    const items = this.treeView.get(id);
    if (items) {
      return items;
    } else {
      const ids = await apiPlaylistDetail(id);
      const songs = await apiSongDetail(ids);
      const ret = await songsItem2TreeItem(id, ids, songs);
      this.treeView.set(id, ret);
      return ret;
    }
  }

  private async getPlaylistItem(): Promise<PlaylistItemTreeItem[]> {
    let playlists: PlaylistItem[];
    if (this.type === 1) {
      playlists = await AccountManager.userPlaylist();
    } else {
      playlists = await AccountManager.favoritePlaylist();
    }
    return playlists.map((playlist) => {
      PlaylistProvider.belongsTo.set(playlist.id, this.type);
      return new PlaylistItemTreeItem(
        playlist.name,
        playlist,
        TreeItemCollapsibleState.Collapsed
      );
    });
  }

  static async playPlaylist(
    id: number,
    index?: QueueItemTreeItem
  ): Promise<void> {
    queueProvider.clear();
    queueProvider.add(await this.getPlaylistContent(id));
    if (index) {
      queueProvider.top(index);
    }
    queueProvider.refresh();
  }

  static async addPlaylist(id: number): Promise<void> {
    queueProvider.add(await this.getPlaylistContent(id));
    queueProvider.refresh();
  }

  static async intelligence(element: QueueItemTreeItem): Promise<void> {
    queueProvider.clear();
    queueProvider.add([element]);
    queueProvider.add(
      await getPlaylistContentIntelligence(element.item.id, element.pid)
    );
    queueProvider.refresh();
  }

  static addSong(element: QueueItemTreeItem): void {
    queueProvider.add([element]);
    queueProvider.refresh();
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

  valueOf(): number {
    return this.item.id;
  }

  get tooltip(): string {
    const { description, playCount, subscribedCount, trackCount } = this.item;
    return `
${localize("description", "Description")}: ${description || ""}
${localize("track", "Track")}: ${trackCount}
${localize("play.count", "Play count")}: ${playCount}
${localize("subscribed.count", "Subscribed count")}: ${subscribedCount}
    `;
  }

  iconPath = new ThemeIcon("selection");

  contextValue = "PlaylistItemTreeItem";
}
