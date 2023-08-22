import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { QueueItemTreeItem, UserTreeItem } from "./index.js";
import type { TreeDataProvider, TreeView } from "vscode";
import { AccountManager } from "../manager/index.js";
import { IPC } from "../utils/index.js";
import type { NeteaseTypings } from "api";
import type { PlayTreeItemData } from "./index.js";
import i18n from "../i18n/index.js";

type Content = UserTreeItem | PlaylistItemTreeItem | QueueItemTreeItem;

export class PlaylistProvider implements TreeDataProvider<Content> {
  private static _instance: PlaylistProvider;

  private static readonly _actions = new WeakMap<
    PlaylistItemTreeItem,
    { resolve: (value: PlayTreeItemData[]) => void; reject: () => void }
  >();

  readonly view!: TreeView<Content>;

  _onDidChangeTreeData = new EventEmitter<UserTreeItem | PlaylistItemTreeItem | undefined | void>();

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
    void this._instance.view.reveal(element, { expand: true });
  }

  static async refreshPlaylist(element: PlaylistItemTreeItem): Promise<readonly PlayTreeItemData[]> {
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
      void this._instance.view.reveal(element, { expand: true });
    });
  }

  static refreshPlaylistHard(element: PlaylistItemTreeItem): void {
    IPC.deleteCache(`playlist_detail${element.valueOf}`);
    this._instance._onDidChangeTreeData.fire(element);
    void this._instance.view.reveal(element, { expand: true });
  }

  getTreeItem(element: Content): Content {
    return element;
  }

  async getChildren(
    element?: UserTreeItem | PlaylistItemTreeItem,
  ): Promise<UserTreeItem[] | PlaylistItemTreeItem[] | QueueItemTreeItem[]> {
    if (!element) {
      const accounts = [];
      for (const [, { userId, nickname }] of AccountManager.accounts) accounts.push(UserTreeItem.new(nickname, userId));
      return accounts;
    }
    if (element instanceof UserTreeItem) {
      const { uid } = element;
      return (await AccountManager.playlist(uid)).map((playlist) => PlaylistItemTreeItem.new(playlist, uid));
    }
    const {
      uid,
      item: { id: pid },
    } = element;
    const songs = await IPC.netease("playlistDetail", [uid, pid]);
    const ret = songs.map((song) => QueueItemTreeItem.new({ ...song, pid, itemType: "q" }));
    const action = PlaylistProvider._actions.get(element);
    if (action) {
      PlaylistProvider._actions.delete(element);
      action.resolve(ret.map(({ data }) => data));
    }
    return ret;
  }

  getParent(element: Content): undefined | UserTreeItem | PlaylistItemTreeItem {
    if (element instanceof UserTreeItem) return;
    if (element instanceof PlaylistItemTreeItem) return UserTreeItem.unsafeGet(element.uid);
    return PlaylistItemTreeItem.unsafeGet(element.data.pid);
  }
}

export class PlaylistItemTreeItem extends TreeItem {
  private static readonly _set = new Map<number, PlaylistItemTreeItem>();

  declare readonly label: string;

  override readonly iconPath = new ThemeIcon("list-ordered");

  override readonly contextValue = "PlaylistItemTreeItem";

  constructor(
    readonly item: NeteaseTypings.PlaylistItem,
    public uid: number,
  ) {
    super(item.name, TreeItemCollapsibleState.Collapsed);

    this.tooltip = `${i18n.word.description}: ${item.description || ""}
${i18n.word.trackCount}: ${item.trackCount}
${i18n.word.playCount}: ${item.playCount}
${i18n.word.subscribedCount}: ${item.subscribedCount}`;
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

  static unsafeGet(pid: number): PlaylistItemTreeItem {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._set.get(pid)!;
  }
}
