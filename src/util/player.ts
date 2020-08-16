import { LIBRARYS, NATIVE, PLAYER_AVAILABLE } from "../constant/setting";
import { NativePlayer, Player } from "../constant/type";
import { Playing, setPosition } from "../state/play";
import { apiLyric, apiScrobble } from "./api";
import { ButtonManager } from "../manager/buttonManager";
import { commands } from "vscode";
import { lock } from "../state/lock";
import { lyric } from "../state/play";
class NoPlayer implements Player {
  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();
  level = 85;

  stop(): void {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async load(_a: string, _b: number, _c: number, _d: number): Promise<void> {
    //
  }

  togglePlay(): void {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  volume(_level: number): void {
    //
  }
}

class AudioPlayer implements Player {
  private player!: NativePlayer;

  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();
  level = 85;

  constructor() {
    for (const library of LIBRARYS) {
      try {
        const player = NATIVE[library];
        this.player = new player();
        break;
      } catch {}
    }

    setInterval(() => {
      if (Playing.get()) {
        if (this.player.empty()) {
          Playing.set(false);
          commands.executeCommand("cloudmusic.next");
        } else {
          const pos = this.player.position();
          setPosition(pos);
          if (pos > this.dt + 8) {
            Playing.set(false);
            commands.executeCommand("cloudmusic.next");
          }
        }
      }
    }, 1000);
  }

  stop(): void {
    Playing.set(false);
    this.player.stop();
  }

  async load(url: string, id: number, pid: number, dt: number): Promise<void> {
    lock.deleteTmp = false;
    if (this.player.load(url)) {
      this.player.setVolume(this.level);
      Playing.set(true);

      apiLyric(id).then(({ time, text }) => {
        lyric.index = 0;
        lyric.time = time;
        lyric.text = text;
      });

      const pTime = this.time;
      this.time = Date.now();

      const diff = this.time - pTime;
      if (diff > 60000 && this.dt > 60) {
        apiScrobble(this.id, this.pid, Math.min(diff / 1000, this.dt));
      }

      this.id = id;
      this.pid = pid;
      this.dt = dt;

      lock.playerLoad = false;
    } else {
      lock.playerLoad = false;
      commands.executeCommand("cloudmusic.next");
    }
  }

  togglePlay(): void {
    if (this.id) {
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

  volume(level: number): void {
    this.level = level;
    this.player.setVolume(level);
    ButtonManager.buttonVolume(level);
  }
}

export const player = PLAYER_AVAILABLE ? new AudioPlayer() : new NoPlayer();
