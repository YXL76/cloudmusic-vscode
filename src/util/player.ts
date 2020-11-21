import type { Lyric, NativePlayer, Player, SongsItem } from "../constant";
import { NATIVE, PLAYER_AVAILABLE, VOLUME_KEY } from "../constant";
import { Playing, lock } from "../state";
import { apiLyric, apiScrobble } from ".";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { commands } from "vscode";

class NoPlayer implements Player {
  item = {} as SongsItem;

  pid = 0;

  time = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(_context: ExtensionContext): void {
    //
  }

  stop(): void {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  load(_a: string, _b: number, _c: SongsItem): void {
    //
  }

  togglePlay(): void {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async volume(_level: number): Promise<void> {
    //
  }
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

  constructor() {
    this.player = new NATIVE.Rodio();

    setInterval(() => {
      if (Playing.get()) {
        if (this.player.empty()) {
          Playing.set(false);
          void commands.executeCommand("cloudmusic.next");
        } else {
          const pos = this.player.position();

          while (lyric.time[lyric.index] <= pos) {
            ++lyric.index;
          }
          ButtonManager.buttonLyric(lyric.text[lyric.index - 1]);

          if (pos > this.item.dt + 8) {
            Playing.set(false);
            void commands.executeCommand("cloudmusic.next");
          }

          if (!lock.deleteTmp.get() && pos > 120 && !lock.playerLoad.get()) {
            void (async () => {
              lock.playerLoad.set(true);
              await lock.deleteTmp.set(true);
              lock.playerLoad.set(false);
            })();
          }
        }
      }
    }, 1000);
  }

  init(context: ExtensionContext): void {
    this.context = context;
    void this.volume(this.context.globalState.get(VOLUME_KEY) || 85);
  }

  stop(): void {
    Playing.set(false);
    this.player.stop();
  }

  load(url: string, pid: number, item: SongsItem): void {
    void lock.deleteTmp.set(false);
    if (this.player.load(url)) {
      this.player.setVolume(this.context.globalState.get(VOLUME_KEY) || 85);
      Playing.set(true);

      void apiLyric(item.id).then(({ time, text }) => {
        lyric.index = 0;
        lyric.time = time;
        lyric.text = text;
      });

      const pTime = this.time;
      this.time = Date.now();

      const diff = this.time - pTime;
      const { id, dt } = this.item;
      if (diff > 60000 && dt > 60) {
        void apiScrobble(id, this.pid, Math.floor(Math.min(diff / 1000, dt)));
      }

      this.pid = pid;
      this.item = item;

      lock.playerLoad.set(false);
    } else {
      lock.playerLoad.set(false);
      void commands.executeCommand("cloudmusic.next");
    }
  }

  togglePlay(): void {
    if (this.item.id) {
      if (Playing.get()) {
        this.player.pause();
        Playing.set(false);
      } else {
        if (this.player.play()) {
          Playing.set(true);
        }
      }
    }
  }

  async volume(level: number): Promise<void> {
    await this.context.globalState.update(VOLUME_KEY, level);
    this.player.setVolume(level);
    ButtonManager.buttonVolume(level);
  }
}

export const player = PLAYER_AVAILABLE ? new AudioPlayer() : new NoPlayer();
