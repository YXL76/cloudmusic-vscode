import { commands } from "vscode";
import { Player } from "../constant/type";
import { apiScrobble } from "./api";
import { lock } from "../state/lock";
import { playing, position } from "../state/play";
import { ButtonManager } from "../manager/buttonManager";
// eslint-disable-next-line @typescript-eslint/naming-convention
const RsPlayer = require("rs-player");

export class AudioPlayer implements Player {
  private static instance: AudioPlayer;
  private player: typeof RsPlayer;

  id = 0;
  pid = 0;
  dt = 0;
  time = Date.now();

  constructor(path?: string, port?: number) {
    this.player = new RsPlayer({ path, port });
    this.player.launch();
    this.player.on("playback", (res: number) => {
      position.set(res / 1000.0);
    });
    this.player.on("end", () => {
      commands.executeCommand("cloudmusic.next");
    });
  }

  static getInstance(path?: string, port?: number): AudioPlayer {
    return this.instance || (this.instance = new AudioPlayer(path, port));
  }

  async quit(): Promise<void> {
    playing.set(false);
    await this.player.quit();
  }

  async stop(): Promise<void> {
    playing.set(false);
    await this.player.stop();
  }

  async load(url: string, id: number, pid: number, dt: number): Promise<void> {
    if (await this.player.load(url)) {
      playing.set(true);
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
    } else {
      lock.playerLoad = false;
      commands.executeCommand("cloudmusic.next");
    }
  }

  async togglePlay(): Promise<void> {
    if (this.id) {
      if (playing.get()) {
        if (await this.player.pause()) {
          playing.set(false);
        }
      } else {
        if (await this.player.play()) {
          playing.set(true);
        }
      }
    }
  }

  async volume(level: number): Promise<void> {
    if (await this.player.setVolume(level)) {
      ButtonManager.buttonVolume(level);
    }
  }
}
