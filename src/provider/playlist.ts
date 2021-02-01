import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { apiCache, songsItem2TreeItem } from "../util";
import { AccountManager } from "../manager";
import type { PlaylistItem } from "../constant";
import type { QueueItemTreeItem } from ".";
import type { TreeDataProvider } from "vscode";
import { apiPlaylistDetail } from "../api";
import { i18n } from "../i18n";

const enum Type {
  userInstance,
  favoriteInstance,
}
export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  static playlists = new Map<number, PlaylistItemTreeItem>();

  private static userInstance: PlaylistProvider;

  private static favoriteInstance: PlaylistProvider;

  private static belongsTo = new Map<number, Type>();

  private static action?: (items: QueueItemTreeItem[]) => void;

  _onDidChangeTreeData = new EventEmitter<
    PlaylistItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private type: Type) {}

  static getUserInstance() {
    return (
      this.userInstance ||
      (this.userInstance = new PlaylistProvider(Type.userInstance))
    );
  }

  static getFavoriteInstance() {
    return (
      this.favoriteInstance ||
      (this.favoriteInstance = new PlaylistProvider(Type.favoriteInstance))
    );
  }

  static refresh(
    element?: PlaylistItemTreeItem,
    action?: (items: QueueItemTreeItem[]) => void,
    refresh?: true
  ) {
    if (element) {
      const { id } = element.item;
      if (refresh) {
        apiCache.del(`playlist_detail${id}`);
      }
      this.action = action;
      if (this.belongsTo.get(id) === Type.userInstance) {
        this.userInstance._onDidChangeTreeData.fire(element);
      } else {
        this.favoriteInstance._onDidChangeTreeData.fire(element);
      }
    } else {
      apiCache.del(`user_playlist${AccountManager.uid}`);
      this.belongsTo.clear();
      this.playlists.clear();
      this.userInstance._onDidChangeTreeData.fire();
      this.favoriteInstance._onDidChangeTreeData.fire();
    }
  }

  private static async getPlaylistContent(id: number) {
    const songs = await apiPlaylistDetail(id);
    const ret = songsItem2TreeItem(id, songs);
    return ret;
  }

  getTreeItem(element: PlaylistItemTreeItem | QueueItemTreeItem) {
    return element;
  }

  async getChildren(element?: PlaylistItemTreeItem) {
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

  private async getPlaylistItem() {
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
  tooltip = `${i18n.word.description}: ${this.item.description || ""}
${i18n.word.trackCount}: ${this.item.trackCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subscribedCount}`;

  iconPath = new ThemeIcon("selection");

  contextValue = "PlaylistItemTreeItem";

  constructor(
    public readonly label: string,
    public readonly item: PlaylistItem,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf() {
    return this.item.id;
  }
}
