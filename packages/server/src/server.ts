import { Player, status } from ".";
import { ipcDefaultConfig, ipcServerId } from "@cloudmusic/shared";
import { IPC } from "node-ipc";
import { IPCEvent } from "@cloudmusic/shared";
// import type { Socket } from "net";

const ipc = new IPC();
Object.assign(ipc.config, ipcDefaultConfig, { id: ipcServerId });

const callback = () => {
  setInterval(() => {
    if (!status.playing) return;

    //  const pos = Player.position();
    /* if (pos > 120000 && !this.prefetchLock) {
        this.prefetchLock = true;
        void prefetch();
      } */
    if (Player.empty()) {
      status.playing = false;
      // void commands.executeCommand("cloudmusic.next", ButtonManager.repeat);
    } /* else {
      while (lyric.time[lyric.index] <= pos - lyric.delay * 1000) ++lyric.index;
      ButtonManager.buttonLyric(lyric[lyric.type].text[lyric.index - 1]);
      if (lyric.updatePanel) lyric.updatePanel(lyric.index - 1);
    } */
  }, 1000);

  const broadcast = (value: Parameters<typeof ipc.server.broadcast>[1]) => {
    ipc.server.broadcast("msg", value);
  };

  ipc.server.on("msg", (data, socket) => {
    switch (data.t) {
      case IPCEvent.Play.load:
        Player.load(data.url);
        break;
      case IPCEvent.Play.play:
        Player.play();
        broadcast({ t: IPCEvent.Play.play });
        break;
      case IPCEvent.Play.pause:
        Player.pause();
        broadcast({ t: IPCEvent.Play.pause });
        break;
      case IPCEvent.Play.stop:
        Player.stop();
        broadcast({ t: IPCEvent.Play.stop });
        break;
      case IPCEvent.Play.volume:
        Player.volume(data.level);
        break;
      case IPCEvent.Queue.clear:
        broadcast({ t: IPCEvent.Queue.clear });
        break;
      default:
        break;
    }
  });
};

ipc.serve(callback);
ipc.server.start();
