import { IPCServer, MusicCache, State, downloadMusic, native } from ".";
import { readdir, stat, unlink } from "fs/promises";
import { NeteaseAPI } from "./api";
import { PersonalFm } from "./state";
import { TMP_DIR } from "@cloudmusic/shared";
import { resolve } from "path";

let prefetchLock = false;

async function prefetch() {
  const id = State.fm ? (await PersonalFm.next()).id : Player.next;
  const idS = `${id}`;
  if (idS === "0" || MusicCache.get(idS)) return;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return;

  const path = resolve(TMP_DIR, idS);
  void downloadMusic(url, idS, path, !State.fm, md5);
  void NeteaseAPI.lyric(id);
}

export class Player {
  static next = 0;

  private static _dt = 0;

  private static _id = 0;

  private static _pid = 0;

  private static _time = 0;

  private static _loadtime = 0;

  private static readonly player = native.playerNew();

  static init(): void {
    setInterval(() => {
      if (!State.playing) return;
      if (Player.empty()) {
        State.playing = false;
        IPCServer.sendToMaster({ t: "player.end" });
        return;
      }

      const pos = Player.position();
      if (pos > 120 && !prefetchLock) {
        prefetchLock = true;
        void prefetch();
      }

      const lpos = pos - State.lyric.delay;
      while (State.lyric.o.time[State.lyric.oi] <= lpos) ++State.lyric.oi;
      while (State.lyric.t.time[State.lyric.ti] <= lpos) ++State.lyric.ti;
      IPCServer.broadcast({
        t: "player.lyricIndex",
        oi: State.lyric.oi - 1,
        ti: State.lyric.ti - 1,
      });
    }, 800);

    setInterval(
      () =>
        void readdir(TMP_DIR).then((files) => {
          for (const file of files)
            if (file !== `${this._id}`) {
              const path = resolve(TMP_DIR, file);
              void stat(path).then(({ mtime }) => {
                if (Date.now() - mtime.getTime() > 480000)
                  unlink(path).catch(() => {
                    //
                  });
              });
            }
        }),
      // 1000 * 60 * 8 = 480000
      480000
    );
  }

  static empty(): boolean {
    return native.playerEmpty(this.player);
  }

  static load(url: string, dt = 0, id = 0, pid = 0, next = 0): boolean {
    const loadtime = Date.now();
    if (loadtime < this._loadtime) return true;
    this._loadtime = loadtime;

    if (!native.playerLoad(this.player, url)) return false;
    this.next = next;
    prefetchLock = false;
    State.playing = true;

    if (id) {
      void NeteaseAPI.lyric(id).then((l) => {
        Object.assign(State.lyric, l, { oi: 0, ti: 0 });
        IPCServer.broadcast({ t: "player.lyric", lyric: { o: l.o, t: l.t } });
      });
    }

    const pTime = this._time;
    this._time = Date.now();

    if (this._id) {
      const diff = this._time - pTime;
      if (diff > 60000 && this._dt > 60000)
        void NeteaseAPI.scrobble(
          this._id,
          this._pid,
          Math.floor(Math.min(diff, this._dt)) / 1000
        );
    }

    this._dt = dt;
    this._id = id;
    this._pid = pid;

    return true;
  }

  static pause(): void {
    native.playerPause(this.player);
    State.playing = false;
  }

  static play(): void {
    if (native.playerPlay(this.player)) State.playing = true;
  }

  static position(): number {
    return native.playerPosition(this.player);
  }

  static stop(): void {
    native.playerStop(this.player);
    State.playing = false;
  }

  static volume(level: number): void {
    native.playerSetVolume(this.player, level);
  }
}

Player.init();
