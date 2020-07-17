import { commands } from "vscode";
import { Player } from "../constant/type";
import { apiScrobble } from "./api";
import { lock } from "../state/lock";
import { playing, position } from "../state/play";
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
    await this.player.quit();
  }

  async stop(): Promise<void> {
    await this.player.stop();
  }

  async load(url: string, id: number, pid: number, dt: number): Promise<void> {
    if (await this.player.load(url)) {
      const pId = this.id;
      const pPid = this.pid;
      const pDt = this.dt;
      const pTime = this.time;
      this.id = id;
      this.pid = pid;
      this.dt = dt;
      this.time = Date.now();
      playing.set(true);

      const diff = this.time - pTime;
      if (diff > 60000 && pDt > 60000) {
        apiScrobble(pId, pPid, Math.floor(Math.min(diff, pDt) / 1000));
      }
    } else {
      commands.executeCommand("cloudmusic.next");
    }
    lock.playerLoad = false;
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
    await this.player.setVolume(level);
  }
}
