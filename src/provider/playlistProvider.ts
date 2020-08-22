import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import {
  apiCache,
  apiPlaylistDetail,
  apiSongDetail,
  songsItem2TreeItem,
} from "../util";
import { AccountManager } from "../manager";
import { PlaylistItem } from "../constant";
import { QueueItemTreeItem } from "../provider";
import { i18n } from "../i18n";

enum Type {
  userInstance,
  favoriteInstance,
}

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  private static userInstance: PlaylistProvider;
  private static favoriteInstance: PlaylistProvider;

  private _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | undefined | void
  > = new EventEmitter<PlaylistItemTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private static belongsTo = new Map<number, Type>();

  private static action?: (items: QueueItemTreeItem[]) => void;

  static playlists = new Map<number, PlaylistItemTreeItem>();
  private static treeView = new Map<number, QueueItemTreeItem[]>();

  constructor(private type: Type) {}

  static getUserInstance(): PlaylistProvider {
    return (
      this.userInstance ||
      (this.userInstance = new PlaylistProvider(Type.userInstance))
    );
  }

  static getFavoriteInstance(): PlaylistProvider {
    return (
      this.favoriteInstance ||
      (this.favoriteInstance = new PlaylistProvider(Type.favoriteInstance))
    );
  }

  static refresh(
    element?: PlaylistItemTreeItem,
    refresh?: boolean,
    action?: (items: QueueItemTreeItem[]) => void
  ): void {
    if (element) {
      this.action = action;
      const { id } = element.item;
      if (refresh) {
        apiCache.del(`playlist_detail${id}`);
        this.treeView.delete(id);
      }
      const type = this.belongsTo.get(id);
      if (type === Type.userInstance) {
        this.userInstance._onDidChangeTreeData.fire(element);
      } else if (type === Type.favoriteInstance) {
        this.favoriteInstance._onDidChangeTreeData.fire(element);
      }
    } else {
      if (refresh) {
        apiCache.del("user_playlist");
        for (const id of this.belongsTo.keys()) {
          apiCache.del(`playlist_detail${id}`);
        }
      }
      this.belongsTo.clear();
      this.playlists.clear();
      this.treeView.clear();
      this.userInstance._onDidChangeTreeData.fire();
      this.favoriteInstance._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(element: PlaylistItemTreeItem | QueueItemTreeItem): TreeItem {
    return element;
  }

  async getChildren(
    element?: PlaylistItemTreeItem
  ): Promise<PlaylistItemTreeItem[] | QueueItemTreeItem[]> {
    if (element) {
      const { id } = element.item;
      const ret = await PlaylistProvider.getPlaylistContent(id);
      const localAction = PlaylistProvider.action;
      if (localAction) {
        PlaylistProvider.action = undefined;
        localAction(ret);
      }
      return ret;
    }
    return await this.getPlaylistItem();
  }

  private static async getPlaylistContent(
    id: number
  ): Promise<QueueItemTreeItem[]> {
    const items = this.treeView.get(id);
    if (!items) {
      const ids = await apiPlaylistDetail(id);
      const songs = await apiSongDetail(ids);
      const ret = await songsItem2TreeItem(id, ids, songs);
      this.treeView.set(id, ret);
      return ret;
    }
    return items;
  }

  private async getPlaylistItem(): Promise<PlaylistItemTreeItem[]> {
    let playlists: PlaylistItem[];
    if (this.type === Type.userInstance) {
      playlists = await AccountManager.userPlaylist();
    } else {
      playlists = await AccountManager.favoritePlaylist();
    }
    return playlists.map((playlist) => {
      PlaylistProvider.belongsTo.set(playlist.id, this.type);
      const item = new PlaylistItemTreeItem(
        playlist.name,
        playlist,
        TreeItemCollapsibleState.Collapsed
      );
      PlaylistProvider.playlists.set(playlist.id, item);
      return item;
    });
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

  tooltip = (() => {
    const { description, playCount, subscribedCount, trackCount } = this.item;
    return `
${i18n.word.description}: ${description || ""}
${i18n.word.trackCount}: ${trackCount}
${i18n.word.playCount}: ${playCount}
${i18n.word.subscribedCount}: ${subscribedCount}
    `;
  })();

  iconPath = new ThemeIcon("selection");

  contextValue = "PlaylistItemTreeItem";
}
