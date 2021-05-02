import { IPCClient, MusicCache, PersonalFm, State, downloadMusic } from ".";
import {
  LocalFileTreeItem,
  QueueItemTreeItem,
  QueueProvider,
} from "../treeview";
import type { Lyric, LyricSpecifyData } from "../constant";
import { LyricType, TMP_DIR, VOLUME_KEY } from "../constant";
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
    const idS = `${treeitem.valueOf}`;

    if (idS !== "0" && !MusicCache.get(idS)) {
      const { url, md5 } = await apiSongUrl(treeitem.item);
      if (!url) return;

      const path = Uri.joinPath(TMP_DIR, idS);
      const data = await downloadMusic(url, idS, path, !PersonalFm.get, md5);
      if (data) {
        const file = createWriteStream(path.fsPath);
        data.pipe(file);
      }
      void apiLyric(treeitem.valueOf);
    }
  } catch {}
}

export const lyric: Lyric = {
  index: 0,
  delay: -1.0,
  type: LyricType.original,
  time: [0],
  o: { text: [i18n.word.lyric] },
  t: { text: [i18n.word.lyric] },
};

export const setLyric = (
  index: number,
  time: number[],
  o: LyricSpecifyData,
  t: LyricSpecifyData
): void => {
  lyric.index = index;
  lyric.time = time;
  lyric.o = o;
  lyric.t = t;
};

export class Player {
  static treeitem?: QueueContent;

  static pid = 0;

  static time = Date.now();

  static context: ExtensionContext;

  static init(): void {
    void this.volume(this.context.globalState.get(VOLUME_KEY, 85));

    /*  setInterval(() => {
      if (State.playing) {
        const pos = NATIVE.playerPosition(this.player);
        if (pos > 120000 && !this.prefetchLock) {
          this.prefetchLock = true;
          void prefetch();
        }
        if (NATIVE.playerEmpty(this.player)) {
          State.playing = false;
          void commands.executeCommand("cloudmusic.next", ButtonManager.repeat);
        } else {
          while (lyric.time[lyric.index] <= pos - lyric.delay * 1000)
            ++lyric.index;
          ButtonManager.buttonLyric(lyric[lyric.type].text[lyric.index - 1]);
          if (lyric.updatePanel) lyric.updatePanel(lyric.index - 1);
        }
      }
    }, 1000);

    // 1000 * 60 * 8 = 480000
    setInterval(
      () =>
        void workspace.fs.readDirectory(TMP_DIR).then((items) => {
          for (const [item] of items)
            if (item !== `${this.treeitem?.id || 0}`) {
              const path = Uri.joinPath(TMP_DIR, item);
              void workspace.fs.stat(path).then(({ mtime }) => {
                // 8 * 60 * 1000 = 960000
                if (Date.now() - mtime > 480000) void workspace.fs.delete(path);
              });
            }
        }),
      480000
    ); */
  }

  static load(url: string, pid: number, treeitem: QueueContent): void {
    IPCClient.load(url);

    /* if (NATIVE.playerLoad(this.player, url)) {
      NATIVE.playerSetVolume(
        this.player,
        this.context.globalState.get(VOLUME_KEY, 85)
      );
      State.playing = true;

      if (treeitem instanceof QueueItemTreeItem)
        void apiLyric(treeitem.valueOf).then(({ time, o, t }) =>
          setLyric(0, time, o, t)
        );

      const pTime = this.time;
      this.time = Date.now();
      if (this.treeitem instanceof QueueItemTreeItem) {
        const diff = this.time - pTime;
        const { id, dt } = this.treeitem.item;
        if (diff > 60000 && dt > 60000)
          void apiScrobble(id, this.pid, Math.floor(Math.min(diff, dt)) / 1000);
      }

      this.treeitem = treeitem;
      this.pid = pid;
      this.prefetchLock = false;
      State.loading = false;
    } else void commands.executeCommand("cloudmusic.next"); */
  }

  static stop(): void {
    IPCClient.stop();
  }

  static togglePlay(): void {
    if (State.playing) IPCClient.pause();
    else IPCClient.play();
  }

  static async volume(level: number): Promise<void> {
    IPCClient.volume(level);
    await this.context.globalState.update(VOLUME_KEY, level);
    ButtonManager.buttonVolume(level);
  }
}
