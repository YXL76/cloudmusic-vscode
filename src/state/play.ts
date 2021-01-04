import { load, songsItem2TreeItem } from "../util";
import { ButtonManager } from "../manager";
import type { QueueItemTreeItem } from "../provider";
import { apiPersonalFm } from "../api";
export class Playing {
  private static state = false;

  static get() {
    return this.state;
  }

  static set(newValue: boolean) {
    if (newValue !== this.state) {
      this.state = newValue;
      ButtonManager.buttonPlay(newValue);
    }
  }
}

export class PersonalFm {
  static item: QueueItemTreeItem[] = [];

  private static state = false;

  static get() {
    return this.state;
  }

  static async set(newValue: boolean) {
    if (newValue !== this.state) {
      this.state = newValue;
      ButtonManager.buttonPrevious(newValue);
      if (newValue) {
        void load(await this.next());
      }
    }
  }

  static async next() {
    if (this.item.length === 0) {
      const songs = await apiPersonalFm();
      this.item = songsItem2TreeItem(0, songs);
    }

    return this.item.splice(0, 1)[0];
  }
}
