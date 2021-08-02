import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { QueueItemTreeItem, UserTreeItem } from ".";
import { AccountManager } from "../manager";
import { IPC } from "../utils";
import type { NeteaseTypings } from "api";
import type { PlayTreeItemData } from ".";
import type { TreeDataProvider } from "vscode";
import i18n from "../i18n";

export class PlaylistProvider
  implements
    TreeDataProvider<UserTreeItem | PlaylistItemTreeItem | QueueItemTreeItem>
{
  private static _instance: PlaylistProvider;

  private static readonly _actions = new Map<
    PlaylistItemTreeItem,
    { resolve: (value: PlayTreeItemData[]) => void; reject: () => void }
  >();

  _onDidChangeTreeData = new EventEmitter<
    UserTreeItem | PlaylistItemTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): PlaylistProvider {
    return this._instance || (this._instance = new PlaylistProvider());
  }

  static refresh(): void {
    this._instance._onDidChangeTreeData.fire();
  }

  static refreshUser(element: UserTreeItem): void {
    IPC.deleteCache(`user_playlist${element.uid}`);
    this._instance._onDidChangeTreeData.fire(element);
  }

  static async refreshPlaylist(
    element: PlaylistItemTreeItem
  ): Promise<readonly PlayTreeItemData[]> {
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
    });
  }

  static refreshPlaylistHard(element: PlaylistItemTreeItem): void {
    IPC.deleteCache(`playlist_detail${element.valueOf}`);
    this._instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(
    element: UserTreeItem | PlaylistItemTreeItem | QueueItemTreeItem
  ): UserTreeItem | PlaylistItemTreeItem | QueueItemTreeItem {
    return element;
  }

  async getChildren(
    element?: UserTreeItem | PlaylistItemTreeItem
  ): Promise<UserTreeItem[] | PlaylistItemTreeItem[] | QueueItemTreeItem[]> {
    if (!element) {
      const accounts = [];
      for (const [, { userId, nickname }] of AccountManager.accounts)
        accounts.push(UserTreeItem.new(nickname, userId));
      return accounts;
    }
    if (element instanceof UserTreeItem) {
      const { uid } = element;
      return (await AccountManager.playlist(uid)).map((playlist) =>
        PlaylistItemTreeItem.new(playlist, uid)
      );
    }
    const {
      uid,
      item: { id: pid },
    } = element;
    const songs = await IPC.netease("playlistDetail", [uid, pid]);
    const ret = songs.map((song) => QueueItemTreeItem.new({ ...song, pid }));
    const action = PlaylistProvider._actions.get(element);
    if (action) {
      PlaylistProvider._actions.delete(element);
      action.resolve(ret.map(({ data }) => data));
    }
    return ret;
  }
}

export class PlaylistItemTreeItem extends TreeItem {
  private static readonly _set = new Map<number, PlaylistItemTreeItem>();

  override readonly label!: string;

  override readonly tooltip = `${i18n.word.description}: ${
    this.item.description || ""
  }
${i18n.word.trackCount}: ${this.item.trackCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subscribedCount}`;

  override readonly iconPath = new ThemeIcon("list-ordered");

  override readonly contextValue = "PlaylistItemTreeItem";

  constructor(readonly item: NeteaseTypings.PlaylistItem, public uid: number) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  override get valueOf(): number {
    return this.item.id;
  }

  static new(item: NeteaseTypings.PlaylistItem, uid = 0): PlaylistItemTreeItem {
    let element = this._set.get(item.id);
    if (element) {
      element.uid = uid;
      return element;
    }
    element = new this(item, uid);
    this._set.set(item.id, element);
    return element;
  }
}
