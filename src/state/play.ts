import { join } from "path";
import { readdirSync, unlinkSync } from "fs";
import { lock } from "./lock";
import { TMP_DIR } from "../constant/setting";
import { Lyric } from "../constant/type";
import { player } from "../util/player";
import { apiPersonalFm } from "../util/api";
import { songsItem2TreeItem } from "../util/util";
import { ButtonManager } from "../manager/buttonManager";
import { QueueProvider, QueueItemTreeItem } from "../provider/queueProvider";
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

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        QueueProvider.getInstance().clear();
      } else {
      }
    }
  }

  static async next(): Promise<QueueItemTreeItem> {
    if (!this.item.length) {
      const songs = await apiPersonalFm();
      this.item = await songsItem2TreeItem(
        0,
        songs.map(({ id }) => id),
        songs
      );
    }
    return this.item.splice(1)[0];
  }
}
