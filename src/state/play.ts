import * as nls from "vscode-nls";
import { NATIVE, TMP_DIR } from "../constant/setting";
import { QueueItemTreeItem, QueueProvider } from "../provider/queueProvider";
import { apiPersonalFm, apiSongUrl } from "../util/api";
import { commands, window } from "vscode";
import { load, songsItem2TreeItem } from "../util/util";
import { readdirSync, unlinkSync } from "fs";
import { ButtonManager } from "../manager/buttonManager";
import { Lyric } from "../constant/type";
import { MusicCache } from "../util/cache";
import { join } from "path";
import { lock } from "./lock";
import { player } from "../util/player";

const { download } = NATIVE;

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

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

const queueProvider = QueueProvider.getInstance();

export async function setPosition(newValue: number): Promise<void> {
  // const index = binarySearch(newValue);
  // ButtonManager.buttonLyric(lyric.text[index]);
  while (lyric.time[lyric.index] <= newValue) {
    ++lyric.index;
  }
  ButtonManager.buttonLyric(lyric.text[lyric.index - 1]);
  if (!lock.deleteTmp && newValue > 120 && !lock.playerLoad) {
    lock.deleteTmp = true;
    lock.playerLoad = true;
    readdirSync(TMP_DIR).forEach((file) => {
      if (file !== `${player.id}`) {
        try {
          unlinkSync(join(TMP_DIR, file));
        } catch {}
      }
    });

    let id = 0;
    let md5 = "";

    if (PersonalFm.get()) {
      if (PersonalFm.item.length > 1) {
        id = PersonalFm.item[1].item.id;
        md5 = PersonalFm.item[1].md5;
      }
    } else {
      if (queueProvider.songs.length > 1) {
        id = queueProvider.songs[1].item.id;
        md5 = queueProvider.songs[1].md5;
      }
    }
    const idString = `${id}`;
    if (id !== 0 && !(await MusicCache.get(idString))) {
      const { url } = (await apiSongUrl([id]))[0];
      if (!url) {
        return;
      }
      const tmpFilePath = join(TMP_DIR, idString);
      try {
        download(url, tmpFilePath, (_, res) => {
          if (res) {
            if (!PersonalFm.get()) {
              MusicCache.put(idString, tmpFilePath, md5);
            }
          } else {
            window.showErrorMessage(localize("error.network", "Network Error"));
          }
        });
      } catch {}
    }

    lock.playerLoad = false;
  }
}
