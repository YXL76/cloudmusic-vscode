import { AccountManager, ButtonManager } from "../manager";
import { Player, apiCache, load } from ".";
import {
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
  RadioProvider,
} from "../treeview";
import { apiPersonalFm, apiRecommendSongs, apiUserLevel } from "../api";
import { commands } from "vscode";
import i18n from "../i18n";
import { unplayable } from "../constant";

export const enum LikeState {
  none = -1,
  like = 1,
  dislike = 0,
}

export class State {
  private static _like = LikeState.none;

  private static _loading = false;

  private static _login = false;

  private static _playing = false;

  static get like(): LikeState {
    return this._like;
  }

  static set like(newValue: LikeState) {
    if (newValue !== this._like) {
      this._like = newValue;
      ButtonManager.buttonLike(newValue);
    }
  }

  static get loading(): boolean {
    return this._loading;
  }

  static set loading(newValue: boolean) {
    if (newValue !== this._loading) {
      this._loading = newValue;
      if (newValue)
        ButtonManager.buttonSong(
          `$(loading~spin) ${i18n.word.song}: ${i18n.word.loading}`
        );
      else if (Player.treeitem) {
        const { name, ar, id } = Player.treeitem.item;
        ButtonManager.buttonSong(name, ar.map(({ name }) => name).join("/"));
        this.like =
          Player.treeitem instanceof QueueItemTreeItem && !unplayable.has(id)
            ? AccountManager.likelist.has(id)
              ? LikeState.like
              : LikeState.dislike
            : LikeState.none;
      }
    }
  }

  static get login(): boolean {
    return this._login;
  }

  static set login(newValue: boolean) {
    if (newValue !== this._login) {
      this._login = newValue;
      apiCache.flushAll();
      PlaylistProvider.refresh();
      RadioProvider.refresh();
      if (newValue) {
        void apiUserLevel();
        ButtonManager.buttonAccount(AccountManager.nickname);
        ButtonManager.show();
        void apiRecommendSongs().then((songs) =>
          QueueProvider.refresh(() => {
            QueueProvider.clear();
            QueueProvider.add(
              songs.map((song) => new QueueItemTreeItem(song, 0))
            );
          })
        );
      } else {
        ButtonManager.hide();
        void commands.executeCommand("cloudmusic.clearQueue");
      }
    }
  }

  static get playing(): boolean {
    return this._playing;
  }

  static set playing(newValue: boolean) {
    if (newValue !== this._playing) {
      this._playing = newValue;
      ButtonManager.buttonPlay(newValue);
    }
  }
}

export class PersonalFm {
  private static item: QueueItemTreeItem[] = [];

  private static state = false;

  static get get(): boolean {
    return this.state;
  }

  static async set(newValue: boolean): Promise<void> {
    if (newValue !== this.state) {
      this.state = newValue;
      ButtonManager.buttonPrevious(newValue);
      if (newValue) void load(await this.next());
    }
  }

  static async head(): Promise<QueueItemTreeItem> {
    if (this.item.length === 0) {
      const songs = await apiPersonalFm();
      this.item = songs.map((song) => new QueueItemTreeItem(song, 0));
    }

    return this.item.splice(0, 1)[0];
  }

  static async next(): Promise<QueueItemTreeItem> {
    if (this.item.length <= 1) {
      const songs = await apiPersonalFm();
      this.item.push(...songs.map((song) => new QueueItemTreeItem(song, 0)));
    }

    return this.item[1];
  }
}
