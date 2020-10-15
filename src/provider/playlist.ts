import type { Event, TreeDataProvider } from "vscode";
import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { apiCache, apiPlaylistDetail, songsItem2TreeItem } from "../util";
import { AccountManager } from "../manager";
import type { PlaylistItem } from "../constant";
import type { QueueItemTreeItem } from ".";
import { i18n } from "../i18n";

const enum Type {
  userInstance,
  favoriteInstance,
}

type RefreshPara = {
  element?: PlaylistItemTreeItem;
  refresh?: true;
  action?: (items: QueueItemTreeItem[]) => void;
};

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  static playlists = new Map<number, PlaylistItemTreeItem>();

  private static userInstance: PlaylistProvider;

  private static favoriteInstance: PlaylistProvider;

  private static belongsTo = new Map<number, Type>();

  private static action?: (items: QueueItemTreeItem[]) => void;

  _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | undefined | void
  > = new EventEmitter<PlaylistItemTreeItem | undefined | void>();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

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

  static refresh({ element, refresh, action }: RefreshPara): void {
    if (element) {
      this.action = action;
      const { id } = element.item;
      if (refresh) {
        apiCache.del(`playlist_detail${id}`);
      }
      const type = this.belongsTo.get(id);
      if (type === Type.userInstance) {
        this.userInstance._onDidChangeTreeData.fire(element);
      } else if (type === Type.favoriteInstance) {
        this.favoriteInstance._onDidChangeTreeData.fire(element);
      }
    } else {
      if (refresh) {
        for (const id of this.belongsTo.keys()) {
          apiCache.del(`playlist_detail${id}`);
        }
      }
      apiCache.del(`user_playlist${AccountManager.uid}`);
      this.belongsTo.clear();
      this.playlists.clear();
      this.userInstance._onDidChangeTreeData.fire();
      this.favoriteInstance._onDidChangeTreeData.fire();
    }
  }

  private static async getPlaylistContent(
    id: number
  ): Promise<QueueItemTreeItem[]> {
    const songs = await apiPlaylistDetail(id);
    const ret = songsItem2TreeItem(id, songs);
    return ret;
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
}
