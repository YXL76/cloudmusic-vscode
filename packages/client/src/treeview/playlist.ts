import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { AccountManager } from "../manager";
import { IPC } from "../utils";
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
      else IPC.deleteCache(`playlist_detail${element.item.id}`);
    } else {
      IPC.deleteCache(`user_playlist${AccountManager.uid}`);
      this.playlists.clear();
    }
    this.instance._onDidChangeTreeData.fire(element);
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
      const { id: pid } = element.item;
      const songs = await IPC.netease("playlistDetail", [pid]);
      const ret = songs.map((song) => QueueItemTreeItem.new({ ...song, pid }));
      const localAction = PlaylistProvider.action;
      if (localAction) {
        PlaylistProvider.action = undefined;
        localAction(ret.map(({ data }) => data));
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
  override readonly label!: string;

  override readonly tooltip = `${i18n.word.description}: ${
    this.item.description || ""
  }
${i18n.word.trackCount}: ${this.item.trackCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subscribedCount}`;

  override readonly iconPath = new ThemeIcon("list-ordered");

  override readonly contextValue = "PlaylistItemTreeItem";

  constructor(readonly item: NeteaseTypings.PlaylistItem) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  override get valueOf(): number {
    return this.item.id;
  }
}
