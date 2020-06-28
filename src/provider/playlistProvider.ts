import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { join } from "path";
import { QueueProvider } from "./queueProvider";
import { PlaylistContent, PlaylistItem } from "../constant/type";
import { AccountManager } from "../api/accountManager";
import { PlaylistManager } from "../api/playlistManager";

export class PlaylistProvider
  implements TreeDataProvider<PlaylistItemTreeItem | PlaylistContentTreeItem> {
  private _onDidChangeTreeData: EventEmitter<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  > = new EventEmitter<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData: Event<
    PlaylistItemTreeItem | PlaylistContentTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private accountManager: AccountManager = AccountManager.getInstance();
  private playlistManager: PlaylistManager = PlaylistManager.getInstance();
  private queueProvider: QueueProvider = QueueProvider.getInstance();

  constructor() {}

  refresh(element?: PlaylistItemTreeItem): void {
    if (element) {
      this._onDidChangeTreeData.fire(element);
    } else {
      this._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(
    element: PlaylistItemTreeItem | PlaylistContentTreeItem
  ): TreeItem {
    return element;
  }

  async getChildren(
    element?: PlaylistItemTreeItem | PlaylistContentTreeItem
  ): Promise<PlaylistItemTreeItem[] | PlaylistContentTreeItem[]> {
    return element
      ? await this.getPlaylistContent(element.item.id)
      : await this.getPlaylistItem();
  }

  async playPlaylist(element: PlaylistItemTreeItem) {
    this.queueProvider.clear();
    this.addPlaylist(element);
  }

  async addPlaylist(element: PlaylistItemTreeItem) {
    const list = await this.getPlaylistContent(element.item.id);
    for (const i of list) {
      this.queueProvider.songs.set(i.item.id, i);
    }
    this.queueProvider.refresh();
  }

  private async getPlaylistContent(
    id: number
  ): Promise<PlaylistContentTreeItem[]> {
    const songs = await this.playlistManager.tracks(id);
    return songs.map((song) => {
      return new PlaylistContentTreeItem(
        `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
        song,
        TreeItemCollapsibleState.None
      );
    });
  }

  private async getPlaylistItem(): Promise<PlaylistItemTreeItem[]> {
    const playlists = await this.accountManager.playlist();
    return playlists.map((playlist) => {
      return new PlaylistItemTreeItem(
        playlist.name,
        playlist,
        TreeItemCollapsibleState.Collapsed
      );
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

  get tooltip(): string {
    const { description, playCount, subscribedCount, trackCount } = this.item;
    return `
    ${description ? description : ""}
    ${trackCount}
    ${playCount}
    ${subscribedCount}
    `;
  }

  iconPath = {
    light: join(__filename, "../../..", "resources", "light", "list.svg"),
    dark: join(__filename, "../../..", "resources", "dark", "list.svg"),
  };

  contextValue = "PlaylistItemTreeItem";
}

export class PlaylistContentTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly item: PlaylistContent,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return ``;
  }

  get description(): string {
    return this.item.arName;
  }

  iconPath = {
    light: join(__filename, "../../..", "resources", "light", "music.svg"),
    dark: join(__filename, "../../..", "resources", "dark", "music.svg"),
  };

  contextValue = "PlaylistContentTreeItem";
}
