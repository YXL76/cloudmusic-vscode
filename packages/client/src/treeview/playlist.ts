import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { AccountManager } from "../manager";
import type { PlaylistItem } from "../constant";
import { QueueItemTreeItem } from ".";
import type { TreeDataProvider } from "vscode";
import { apiCache } from "../util";
import { apiPlaylistDetail } from "../api";
import i18n from "../i18n";

const enum Type {
  userInstance,
  favoriteInstance,
}
export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem> {
  static readonly playlists = new Map<number, PlaylistItemTreeItem>();

  private static userInstance: PlaylistProvider;

  private static favoriteInstance: PlaylistProvider;

  private static readonly belongsTo = new Map<number, Type>();

  private static action?: (items: QueueItemTreeItem[]) => void;

  _onDidChangeTreeData = new EventEmitter<
    PlaylistItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

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
    action?: (items: QueueItemTreeItem[]) => void
  ): void {
    if (element) {
      const { id } = element.item;

      if (action) this.action = action;
      else apiCache.del(`playlist_detail${id}`);

      if (this.belongsTo.get(id) === Type.userInstance)
        this.userInstance._onDidChangeTreeData.fire(element);
      else this.favoriteInstance._onDidChangeTreeData.fire(element);
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
    const ret = songs.map((song) => new QueueItemTreeItem(song, id));
    return ret;
  }

  getTreeItem(
    element: PlaylistItemTreeItem | QueueItemTreeItem
  ): PlaylistItemTreeItem | QueueItemTreeItem {
    return element;
  }

  async getChildren(
    element?: PlaylistItemTreeItem
  ): Promise<(PlaylistItemTreeItem | QueueItemTreeItem)[]> {
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
      const item = new PlaylistItemTreeItem(playlist);
      PlaylistProvider.playlists.set(playlist.id, item);
      return item;
    });
  }
}

export class PlaylistItemTreeItem extends TreeItem {
  readonly label!: string;

  readonly tooltip = `${i18n.word.description}: ${this.item.description || ""}
${i18n.word.trackCount}: ${this.item.trackCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subscribedCount}`;

  readonly iconPath = new ThemeIcon("selection");

  readonly contextValue = "PlaylistItemTreeItem";

  constructor(
    public readonly item: PlaylistItem,
    public readonly collapsibleState = TreeItemCollapsibleState.Collapsed
  ) {
    super(item.name, collapsibleState);
  }

  get valueOf(): number {
    return this.item.id;
  }
}
