import { Player, State } from ".";
import { ipcDefaultConfig, ipcServerId } from "@cloudmusic/shared";
import { IPC } from "node-ipc";
import { IPCEvent } from "@cloudmusic/shared";

const ipc = new IPC();
Object.assign(ipc.config, ipcDefaultConfig, { id: ipcServerId });

export const broadcast = (
  value: Parameters<typeof ipc.server.broadcast>[1]
): void => {
  ipc.server.broadcast("msg", value);
};

const callback = () => {
  setInterval(() => {
    if (!State.playing) return;

    //  const pos = Player.position();
    /* if (pos > 120000 && !this.prefetchLock) {
        this.prefetchLock = true;
        void prefetch();
      } */
    if (Player.empty()) {
      State.playing = false;
      // void commands.executeCommand("cloudmusic.next", ButtonManager.repeat);
    } /* else {
      while (lyric.time[lyric.index] <= pos - lyric.delay * 1000) ++lyric.index;
      ButtonManager.buttonLyric(lyric[lyric.type].text[lyric.index - 1]);
      if (lyric.updatePanel) lyric.updatePanel(lyric.index - 1);
    } */
  }, 1000);

  ipc.server.on("msg", (data) => {
    switch (data.t) {
      case IPCEvent.Play.load:
        if (Player.load(data.url)) broadcast({ t: IPCEvent.Play.load });
        break;
      case IPCEvent.Play.toggle:
        State.playing ? Player.pause() : Player.play();
        break;
      case IPCEvent.Play.stop:
        Player.stop();
        break;
      case IPCEvent.Play.volume:
        Player.volume(data.level);
        broadcast(data);
        break;
      case IPCEvent.Queue.add:
      case IPCEvent.Queue.clear:
      case IPCEvent.Queue.delete:
      case IPCEvent.Queue.new:
      case IPCEvent.Queue.play:
      case IPCEvent.Queue.shift:
      case IPCEvent.Queue.sort:
        broadcast(data);
        break;
    }
  });
};

ipc.serve(callback);
ipc.server.start();
