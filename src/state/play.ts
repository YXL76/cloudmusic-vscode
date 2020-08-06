import { load, songsItem2TreeItem } from "../util/util";
import { readdirSync, unlinkSync } from "fs";
import { ButtonManager } from "../manager/buttonManager";
import { Lyric } from "../constant/type";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { TMP_DIR } from "../constant/setting";
import { apiPersonalFm } from "../util/api";
import { commands } from "vscode";
import { join } from "path";
import { lock } from "./lock";
import { player } from "../util/player";

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
  index: 0,
  delay: -1.0,
  time: [0],
  text: ["Lyric"],
};

/* function binarySearch(newValue: number) {
  const { time, delay } = lyric;
  const needle = newValue + delay;

  let start = 0;
  let end = time.length - 1;

  while (end - start > 1) {
    const middle = Math.floor((start + end) / 2);
    const result = needle - time[middle];

    if (!result) {
      return middle;
    }
    if (result > 0) {
      start = middle;
    } else {
      end = middle;
    }
  }

  return start;
} */

export function setPosition(newValue: number): void {
  // const index = binarySearch(newValue);
  // ButtonManager.buttonLyric(lyric.text[index]);
  while (lyric.time[lyric.index] <= newValue) {
    ++lyric.index;
  }
  ButtonManager.buttonLyric(lyric.text[lyric.index - 1]);
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
