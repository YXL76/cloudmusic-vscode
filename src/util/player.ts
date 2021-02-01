import { Loading, PersonalFm, Playing } from "../state";
import { LocalFileTreeItem, QueueProvider } from "../provider";
import type { Lyric, NativePlayer, Player, SongsItem } from "../constant";
import { MusicCache, downloadMusic } from ".";
import { NATIVE, PLAYER_AVAILABLE, TMP_DIR, VOLUME_KEY } from "../constant";
import { Uri, commands, workspace } from "vscode";
import { apiLyric, apiScrobble, apiSongUrl } from "../api";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { createWriteStream } from "fs";

class NoPlayer implements Player {
  item = {} as SongsItem;

  pid = 0;

  time = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(_context: ExtensionContext) {
    //
  }

  stop() {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  load(_a: string, _b: number, _c: SongsItem) {
    //
  }

  togglePlay() {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async volume(_level: number) {
    //
  }
}

async function prefetch() {
  if (QueueProvider.songs[1] instanceof LocalFileTreeItem) return;
  try {
    const { item } = PersonalFm.get()
      ? PersonalFm.item[1]
      : QueueProvider.songs[1];
    const idString = `${item.id}`;

    if (idString !== "0" && !(await MusicCache.get(idString))) {
      const { url, md5 } = await apiSongUrl(item);
      if (!url) return;

      const path = Uri.joinPath(TMP_DIR, idString);
      const data = await downloadMusic(
        url,
        idString,
        path,
        !PersonalFm.get(),
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
  time: [0],
  text: ["Lyric"],
};

class AudioPlayer implements Player {
  item = {} as SongsItem;

  pid = 0;

  time = Date.now();

  private context!: ExtensionContext;

  private player!: NativePlayer;

  private prefetchLock = false;

  constructor() {
    this.player = NATIVE.playerNew();

    setInterval(() => {
      if (Playing.get()) {
        const pos = NATIVE.playerPosition(this.player);
        if (pos > 120 && !this.prefetchLock) {
          this.prefetchLock = true;
          void prefetch();
        }
        if (NATIVE.playerEmpty(this.player) || pos > this.item.dt + 8) {
          Playing.set(false);
          void commands.executeCommand("cloudmusic.next");
        } else {
          while (lyric.time[lyric.index] <= pos) {
            ++lyric.index;
          }
          ButtonManager.buttonLyric(lyric.text[lyric.index - 1]);
        }
      }
    }, 1000);

    // 1000 * 60 * 8 = 480000
    setInterval(() => {
      void workspace.fs.readDirectory(TMP_DIR).then((items) => {
        for (const item of items) {
          if (item[0] !== `${this.item.id}`) {
            const path = Uri.joinPath(TMP_DIR, item[0]);
            void workspace.fs.stat(path).then(({ mtime }) => {
              // 8 * 60 * 1000 = 960000
              if (Date.now() - mtime > 480000) {
                void workspace.fs.delete(Uri.joinPath(TMP_DIR, item[0]));
              }
            });
          }
        }
      });
    }, 480000);
  }

  init(context: ExtensionContext) {
    this.context = context;
    void this.volume(this.context.globalState.get(VOLUME_KEY) ?? 85);
  }

  stop() {
    Playing.set(false);
    NATIVE.playerStop(this.player);
  }

  load(url: string, pid: number, item: SongsItem) {
    if (NATIVE.playerLoad(this.player, url)) {
      NATIVE.playerSetVolume(
        this.player,
        this.context.globalState.get(VOLUME_KEY) ?? 85
      );
      Playing.set(true);

      if (item.id !== 0) {
        void apiLyric(item.id).then(({ time, text }) => {
          lyric.index = 0;
          lyric.time = time;
          lyric.text = text;
        });
      }

      const pTime = this.time;
      this.time = Date.now();
      if (this.item.id !== 0) {
        const diff = this.time - pTime;
        const { id, dt } = this.item;
        if (diff > 60000 && dt > 60) {
          void apiScrobble(id, this.pid, Math.floor(Math.min(diff / 1000, dt)));
        }
      }

      this.item = item;
      this.pid = pid;
      this.prefetchLock = false;
      Loading.set(false);
    } else {
      void commands.executeCommand("cloudmusic.next");
    }
  }

  togglePlay() {
    if (this.item.id) {
      if (Playing.get()) {
        NATIVE.playerPause(this.player);
        Playing.set(false);
      } else {
        if (NATIVE.playerPlay(this.player)) {
          Playing.set(true);
        }
      }
    }
  }

  async volume(level: number) {
    await this.context.globalState.update(VOLUME_KEY, level);
    NATIVE.playerSetVolume(this.player, level);
    ButtonManager.buttonVolume(level);
  }
}

export const player = PLAYER_AVAILABLE ? new AudioPlayer() : new NoPlayer();
