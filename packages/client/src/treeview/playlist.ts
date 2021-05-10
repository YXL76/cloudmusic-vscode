import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { AccountManager } from "../manager";
import { IPC } from "../util";
import type { NeteaseTypings } from "api";
import { QueueItemTreeItem } from ".";
import type { RefreshAction } from ".";
import type { TreeDataProvider } from "vscode";
import i18n from "../i18n";

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | QueueItemTreeItem>
{
  static readonly playlists = new Map<number, PlaylistItemTreeItem>();

  private static instance: PlaylistProvider;

  private static action?: RefreshAction;

  _onDidChangeTreeData = new EventEmitter<
    PlaylistItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): PlaylistProvider {
    return this.instance || (this.instance = new PlaylistProvider());
  }

  static refresh(element?: PlaylistItemTreeItem, action?: RefreshAction): void {
    if (element) {
      if (action) this.action = action;
      // TODO
      // else apiCache.del(`playlist_detail${element.item.id}`);
    } else {
      // TODO
      // apiCache.del(`user_playlist${AccountManager.uid}`);
      this.playlists.clear();
    }
    this.instance._onDidChangeTreeData.fire(element);
  }

  private static async getPlaylistContent(pid: number) {
    const songs = await IPC.netease("playlistDetail", [pid]);
    const ret = songs.map((song) => QueueItemTreeItem.new({ ...song, pid }));
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
    return (await AccountManager.playlist()).map((playlist) => {
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

  constructor(readonly item: NeteaseTypings.PlaylistItem) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  get valueOf(): number {
    return this.item.id;
  }
}
