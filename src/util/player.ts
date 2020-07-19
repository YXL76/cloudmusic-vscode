import { join } from "path";
import { commands } from "vscode";
import { Player, NativePlayer } from "../constant/type";
import { PLATFORM, PLAYER_AVAILABLE } from "../constant/setting";
import { sleep } from "./util";
import { apiScrobble } from "./api";
import { lock } from "../state/lock";
import { Playing, setPosition } from "../state/play";
import { ButtonManager } from "../manager/buttonManager";
// @ts-ignore
const nPlayer = __non_webpack_require__(
  join("..", "build", "player", `${PLATFORM}.node`)
).Player;
class NoPlayer implements Player {
  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();

  async stop(): Promise<void> {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async load(_a: string, _b: number, _c: number, _d: number): Promise<void> {
    //
  }

  async togglePlay(): Promise<void> {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async volume(_level: number): Promise<void> {
    //
  }
}

class AudioPlayer implements Player {
  private player: NativePlayer;

  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();

  constructor() {
    this.player = new nPlayer();
    setInterval(() => {
      if (!this.player.isPaused()) {
        if (this.player.empty()) {
          Playing.set(false);
          commands.executeCommand("cloudmusic.next");
        } else {
          setPosition(this.player.position() / 1000.0);
        }
      }
    }, 1000);
  }

  async stop(): Promise<void> {
    Playing.set(false);
    this.player.stop();
  }

  async load(url: string, id: number, pid: number, dt: number): Promise<void> {
    lock.deleteTmp = false;
    let i = 5;
    while (i) {
      if (this.player.load(url)) {
        Playing.set(true);
        const pTime = this.time;
        this.time = Date.now();

        const diff = this.time - pTime;
        if (diff > 60000 && this.dt > 60000) {
          apiScrobble(this.id, this.pid, Math.min(diff, this.dt) / 1000);
        }

        this.id = id;
        this.pid = pid;
        this.dt = dt;

        lock.playerLoad = false;
        break;
      }
      --i;
      await sleep(256);
    }
    if (!i) {
      lock.playerLoad = false;
      commands.executeCommand("cloudmusic.next");
    }
  }

  async togglePlay(): Promise<void> {
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

  async volume(level: number): Promise<void> {
    this.player.setVolume(level);
    ButtonManager.buttonVolume(level);
  }
}

export const player = PLAYER_AVAILABLE ? new AudioPlayer() : new NoPlayer();
