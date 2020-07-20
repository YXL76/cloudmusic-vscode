import { join } from "path";
import { commands } from "vscode";
import { readdirSync, unlinkSync } from "fs";
import { lock } from "./lock";
import { TMP_DIR } from "../constant/setting";
import { Lyric } from "../constant/type";
import { player } from "../util/player";
import { apiPersonalFm } from "../util/api";
import { songsItem2TreeItem, load } from "../util/util";
import { ButtonManager } from "../manager/buttonManager";
import { QueueItemTreeItem } from "../provider/queueProvider";
const { closestSearch } = require("@thejellyfish/binary-search");

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

export const lyric: Lyric = {
  delay: -3.5,
  time: [0],
  text: ["Lyric"],
};

export function setPosition(newValue: number): void {
  const index = closestSearch(lyric.time, newValue + lyric.delay);
  ButtonManager.buttonLyric(lyric.text[index]);
  if (!lock.deleteTmp && newValue > 100 && !lock.playerLoad) {
    lock.deleteTmp = true;
    lock.playerLoad = true;
    readdirSync(TMP_DIR).forEach((file) => {
      if (file !== `${player.id}`) {
        try {
          unlinkSync(join(TMP_DIR, file));
        } catch {}
      }
    });
    lock.playerLoad = false;
  }
}

export class PersonalFm {
  private static state = false;
  private static item: QueueItemTreeItem[] = [];

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
