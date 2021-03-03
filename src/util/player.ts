import { Loading, PersonalFm, Playing } from "../state";
import {
  LocalFileTreeItem,
  QueueItemTreeItem,
  QueueProvider,
} from "../treeview";
import type { Lyric, LyricLine } from "../constant";
import { LyricType, NATIVE, TMP_DIR, VOLUME_KEY } from "../constant";
import { MusicCache, downloadMusic } from ".";
import { Uri, commands, workspace } from "vscode";
import { apiLyric, apiScrobble, apiSongUrl } from "../api";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import type { QueueContent } from "../treeview";
import { createWriteStream } from "fs";
import i18n from "../i18n";

async function prefetch() {
  try {
    const treeitem = PersonalFm.get
      ? await PersonalFm.next()
      : QueueProvider.next;
    if (!treeitem || treeitem instanceof LocalFileTreeItem) return;
    const idString = `${treeitem.valueOf}`;

    if (idString !== "0" && !(await MusicCache.get(idString))) {
      const { url, md5 } = await apiSongUrl(treeitem.item);
      if (!url) return;

      const path = Uri.joinPath(TMP_DIR, idString);
      const data = await downloadMusic(
        url,
        idString,
        path,
        !PersonalFm.get,
        md5
      );
      if (data) {
        const file = createWriteStream(path.fsPath);
        data.pipe(file);
      }
    }
  } catch {}
}

export const lyric: Lyric = {
  index: 0,
  delay: -1.0,
  type: LyricType.original,
  lrc: { time: [0], text: [i18n.word.lyric] },
  tlyric: { time: [0], text: [i18n.word.lyric] },
};

export const setLyric = (
  index: number,
  lrc: LyricLine,
  tlyric: LyricLine
): void => {
  lyric.index = index;
  lyric.lrc = lrc;
  lyric.tlyric = tlyric;
};

export class Player {
  static treeitem?: QueueContent;

  static pid = 0;

  static time = Date.now();

  static context: ExtensionContext;

  private static readonly player = NATIVE.playerNew();

  private static prefetchLock = false;

  static init(): void {
    void this.volume(this.context.globalState.get(VOLUME_KEY) ?? 85);

    setInterval(() => {
      if (Playing.get) {
        const pos = NATIVE.playerPosition(this.player);
        if (pos > 120000 && !this.prefetchLock) {
          this.prefetchLock = true;
          void prefetch();
        }
        if (NATIVE.playerEmpty(this.player)) {
          Playing.set(false);
          void commands.executeCommand("cloudmusic.next", ButtonManager.repeat);
        } else {
          while (lyric[lyric.type].time[lyric.index] <= pos) ++lyric.index;
          ButtonManager.buttonLyric(lyric[lyric.type].text[lyric.index - 1]);
        }
      }
    }, 1000);

    // 1000 * 60 * 8 = 480000
    setInterval(
      () =>
        void workspace.fs.readDirectory(TMP_DIR).then((items) => {
          for (const item of items)
            if (item[0] !== `${this.treeitem?.id || 0}`) {
              const path = Uri.joinPath(TMP_DIR, item[0]);
              void workspace.fs.stat(path).then(({ mtime }) => {
                // 8 * 60 * 1000 = 960000
                if (Date.now() - mtime > 480000)
                  void workspace.fs.delete(Uri.joinPath(TMP_DIR, item[0]));
              });
            }
        }),
      480000
    );
  }

  static stop(): void {
    NATIVE.playerStop(this.player);
  }

  static load(url: string, pid: number, treeitem: QueueContent): void {
    if (NATIVE.playerLoad(this.player, url)) {
      NATIVE.playerSetVolume(
        this.player,
        this.context.globalState.get(VOLUME_KEY) ?? 85
      );
      Playing.set(true);

      if (treeitem instanceof QueueItemTreeItem) {
        void apiLyric(treeitem.valueOf).then(({ lrc, tlyric }) =>
          setLyric(0, lrc, tlyric)
        );
      }

      const pTime = this.time;
      this.time = Date.now();
      if (this.treeitem instanceof QueueItemTreeItem) {
        const diff = this.time - pTime;
        const { id, dt } = this.treeitem.item;
        if (diff > 60000 && dt > 60000) {
          void apiScrobble(id, this.pid, Math.floor(Math.min(diff, dt)) / 1000);
        }
      }

      this.treeitem = treeitem;
      this.pid = pid;
      this.prefetchLock = false;
      Loading.set(false);
    } else void commands.executeCommand("cloudmusic.next");
  }

  static togglePlay(): void {
    if (!NATIVE.playerEmpty(this.player)) {
      if (Playing.get) {
        NATIVE.playerPause(this.player);
        Playing.set(false);
      } else {
        if (NATIVE.playerPlay(this.player)) Playing.set(true);
      }
    }
  }

  static async volume(level: number): Promise<void> {
    await this.context.globalState.update(VOLUME_KEY, level);
    NATIVE.playerSetVolume(this.player, level);
    ButtonManager.buttonVolume(level);
  }
}
