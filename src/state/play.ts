import { ButtonManager } from "../manager";
import { QueueItemTreeItem } from "../treeview";
import { apiPersonalFm } from "../api";
import { load } from "../util";

export class Playing {
  private static state = false;

  static get get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
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
      this.item = this.item.concat(
        songs.map((song) => new QueueItemTreeItem(song, 0))
      );
    }

    return this.item[1];
  }
}
