import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { PersonalFm, lock } from "../state";
import { QueueItemTreeItem, QueueProvider } from "../provider";
import {
  apiPlaylistDetail,
  apiSongDetail,
  load,
  songsItem2TreeItem,
} from "../util";
import { AccountManager } from "../manager";
import { PlaylistItem } from "../constant";
import { i18n } from "../i18n";
import NodeCache = require("node-cache");

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

  private static belongsTo: Map<number, Type> = new Map<number, Type>();
  private static playlists: Map<number, PlaylistItemTreeItem> = new Map<
    number,
    PlaylistItemTreeItem
  >();

  private static action?: () => void;

  static treeView = new NodeCache({
    stdTTL: 300,
    checkperiod: 600,
    useClones: false,
    deleteOnExpire: true,
    enableLegacyCallbacks: false,
    maxKeys: -1,
  });

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

  static refresh(element?: PlaylistItemTreeItem, action?: () => void): void {
    if (element) {
      PlaylistProvider.action = action;
      const type = this.belongsTo.get(element.item.id);
      if (type === Type.userInstance) {
        this.userInstance._onDidChangeTreeData.fire(element);
      } else if (type === Type.favoriteInstance) {
        this.favoriteInstance._onDidChangeTreeData.fire(element);
      }
    } else {
      this.belongsTo.clear();
      this.treeView.del(this.treeView.keys());
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
        localAction();
      }
      return ret;
    }
    return await this.getPlaylistItem();
  }

  private static async getPlaylistContent(
    id: number
  ): Promise<QueueItemTreeItem[]> {
    if (!this.treeView.get(id)) {
      const ids = await apiPlaylistDetail(id);
      const songs = await apiSongDetail(ids);
      const ret = await songsItem2TreeItem(id, ids, songs);
      this.treeView.set(id, ret);
      return ret;
    }
    return this.treeView.get(id) as QueueItemTreeItem[];
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

  static playPlaylist(id: number, element?: QueueItemTreeItem): void {
    PlaylistProvider.refresh(PlaylistProvider.playlists.get(id), () => {
      QueueProvider.refresh(async () => {
        PersonalFm.set(false);
        QueueProvider.clear();
        QueueProvider.add(this.treeView.get(id) as QueueItemTreeItem[]);
        if (element) {
          QueueProvider.shift(QueueProvider.songs.indexOf(element));
        }
        if (!lock.playerLoad.get()) {
          load(QueueProvider.songs[0]);
        }
      });
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

  get tooltip(): string {
    const { description, playCount, subscribedCount, trackCount } = this.item;
    return `
${i18n.word.description}: ${description}
${i18n.word.trackCount}: ${trackCount}
${i18n.word.playCount}: ${playCount}
${i18n.word.subscribedCount}: ${subscribedCount}
    `;
  }

  iconPath = new ThemeIcon("selection");

  contextValue = "PlaylistItemTreeItem";
}
