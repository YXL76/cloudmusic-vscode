import { load, songsItem2TreeItem } from "../util";
import { ButtonManager } from "../manager";
import { QueueItemTreeItem } from "../provider";
import { apiPersonalFm } from "../util";
import { commands } from "vscode";

export class Playing {
  private static state = false;

  static get(): boolean {
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
  private static state = false;
  static item: QueueItemTreeItem[] = [];

  static get(): boolean {
    return this.state;
  }

  static async set(newValue: boolean): Promise<void> {
    if (newValue !== this.state) {
      this.state = newValue;
      commands.executeCommand("cloudmusic.clearQueue");
      ButtonManager.buttonPrevious(newValue);
      if (newValue) {
        load(await this.next());
      }
    }
  }

  static async next(): Promise<QueueItemTreeItem> {
    if (this.item.length === 0) {
      const songs = await apiPersonalFm();
      this.item = await songsItem2TreeItem(
        0,
        songs.map(({ id }) => id),
        songs
      );
    }

    return this.item.splice(0, 1)[0];
  }
}
