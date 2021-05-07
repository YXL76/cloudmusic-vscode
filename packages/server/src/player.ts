import { State, native } from ".";
import { IPCEvent } from "@cloudmusic/shared";
import { IPCServer } from "./server";

export class Player {
  private static readonly player = native.playerNew();

  static init(): void {
    // void this.volume(this.context.globalState.get(VOLUME_KEY, 85));
    // 1000 * 60 * 8 = 480000
    /*  setInterval(
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

  /* static load(url: string, pid: number, treeitem: QueueContent): void {
    if (native.playerLoad(this.player, url)) {
      native.playerSetVolume(
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
    } else void commands.executeCommand("cloudmusic.next");
  } */

  /*  static togglePlay(): void {
    if (!native.playerEmpty(this.player)) {
      if (State.playing) {
        native.playerPause(this.player);
        State.playing = false;
      } else if (native.playerPlay(this.player)) State.playing = true;
    }
  } */

  static empty(): boolean {
    return native.playerEmpty(this.player);
  }

  static load(url: string): boolean {
    if (native.playerLoad(this.player, url)) {
      State.playing = true;
      return true;
    }
    return false;
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

setInterval(() => {
  if (!State.playing) return;
  // const pos = Player.position();

  /* if (pos > 120000 && !this.prefetchLock) {
    this.prefetchLock = true;
    void prefetch();
  } */

  if (Player.empty()) {
    State.playing = false;
    IPCServer.sendToMaster({ t: IPCEvent.Play.end });
    return;
  }

  /* while (lyric.time[lyric.index] <= pos - lyric.delay * 1000) ++lyric.index;
  ButtonManager.buttonLyric(lyric[lyric.type].text[lyric.index - 1]);
  if (lyric.updatePanel) lyric.updatePanel(lyric.index - 1); */
}, 1024);
