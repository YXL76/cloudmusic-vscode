import { IPCEvent, ipcDefaultConfig, ipcServerId } from "@cloudmusic/shared";
import { LocalFileTreeItem, QueueProvider } from "../treeview";
import { MUSIC_QUALITY, TMP_DIR } from "../constant";
import { MusicCache, State, downloadMusic } from ".";
import type {
  PlayTreeItemData,
  QueueSortOrder,
  QueueSortType,
} from "../treeview";
import { Uri, window } from "vscode";
import { ButtonManager } from "../manager";
import { IPC } from "node-ipc";
import { apiSongUrl } from "../api";
import { createWriteStream } from "fs";
import i18n from "../i18n";

const ipc = new IPC();
Object.assign(ipc.config, ipcDefaultConfig, { id: `${process.pid}` });

const callback = () => {
  /* ipc.of[ipcServerId].on("connect", () => {
    console.log("connect");
  });
  ipc.of[ipcServerId].on("destroy", () => {
    console.log("destroyed");
  });
  ipc.of[ipcServerId].on("disconnect", () => {
    console.log("disconnected");
  }); */

  ipc.of[ipcServerId].on("msg", (data) => {
    switch (data.t) {
      case IPCEvent.Play.load:
        State.loading = false;
        break;
      case IPCEvent.Play.pause:
        ButtonManager.buttonPlay(false);
        break;
      case IPCEvent.Play.play:
        ButtonManager.buttonPlay(true);
        break;
      case IPCEvent.Play.volume:
        ButtonManager.buttonVolume(data.level);
        break;
      case IPCEvent.Queue.add:
        QueueProvider.addRaw(data.items as PlayTreeItemData[], data.index);
        break;
      case IPCEvent.Queue.clear:
        QueueProvider.clear();
        break;
      case IPCEvent.Queue.delete:
        QueueProvider.delete(data.id);
        break;
      case IPCEvent.Queue.new:
        QueueProvider.newRaw(data.items as PlayTreeItemData[], data.id);
        break;
      case IPCEvent.Queue.play:
        QueueProvider.top(data.id);
        break;
      case IPCEvent.Queue.shift:
        QueueProvider.shift(data.index);
        break;
      case IPCEvent.Queue.sort:
        QueueProvider.sort(data.type, data.order);
        break;
    }
  });
};

ipc.connectTo(ipcServerId, callback);

const minSize = MUSIC_QUALITY === 999000 ? 2 * 1024 * 1024 : 256 * 1024;

export class IPCClient {
  private static readonly ipc = ipc;

  static async load(): Promise<void> {
    const { playItem } = State;
    if (!playItem) return;
    State.loading = true;

    if (playItem instanceof LocalFileTreeItem) {
      this._emit({ t: IPCEvent.Play.load, url: playItem.tooltip });
      return;
    }

    const { item, pid } = playItem;
    const idS = `${item.id}`;
    {
      const url = MusicCache.get(idS);
      if (url) {
        this._emit({ t: IPCEvent.Play.load, url, pid });
        return;
      }
    }
    {
      const { url, md5 } = await apiSongUrl(item);
      if (!url) {
        // void commands.executeCommand("cloudmusic.next");
        return;
      }

      const tmpUri = Uri.joinPath(TMP_DIR, idS);
      const data = await downloadMusic(
        url,
        idS,
        tmpUri,
        // !PersonalFm.state,
        true,
        md5
      );
      if (!data) return;
      let len = 0;
      const onData = ({ length }: { length: number }) => {
        len += length;
        if (len > minSize) {
          data.removeListener("data", onData);
          this._emit({ t: IPCEvent.Play.load, url: tmpUri.fsPath, pid });
        }
      };
      data.on("data", onData);
      data.once("error", (err) => {
        console.error(err);
        void window.showErrorMessage(i18n.sentence.error.network);
        // void commands.executeCommand("cloudmusic.next");
      });
      const file = createWriteStream(tmpUri.fsPath);
      data.pipe(file);
    }
  }

  static stop(): void {
    this._emit({ t: IPCEvent.Play.stop });
  }

  static toggle(): void {
    this._emit({ t: IPCEvent.Play.toggle });
  }

  static volume(level: number): void {
    this._emit({ t: IPCEvent.Play.volume, level });
  }

  static add(items: PlayTreeItemData[], index?: number): void {
    this._emit({ t: IPCEvent.Queue.add, items, index });
  }

  static clear(): void {
    this._emit({ t: IPCEvent.Queue.clear });
  }

  static delete(id: number | string): void {
    this._emit({ t: IPCEvent.Queue.delete, id });
  }

  static new(items: PlayTreeItemData[], id?: number): void {
    this._emit({ t: IPCEvent.Queue.new, items, id });
  }

  static playSong(id: number | string): void {
    this._emit({ t: IPCEvent.Queue.play, id });
  }

  static random(): void {
    this._emit({
      t: IPCEvent.Queue.random,
      items: QueueProvider.random(),
    });
  }

  static shift(index: number): void {
    this._emit({ t: IPCEvent.Queue.shift, index });
  }

  static sort(type: QueueSortType, order: QueueSortOrder): void {
    this._emit({ t: IPCEvent.Queue.sort, type, order });
  }

  private static _emit(value: Parameters<typeof ipc.of.x.emit>[1]): void {
    this.ipc.of[ipcServerId].emit("msg", value);
  }
}
