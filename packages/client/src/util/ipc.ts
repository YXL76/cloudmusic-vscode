import type {
  IPCBroadcastMsg,
  IPCClientMsg,
  IPCServerMsg,
} from "@cloudmusic/shared";
import {
  IPCEvent,
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
import { LocalFileTreeItem, QueueProvider } from "../treeview";
import { MUSIC_QUALITY, TMP_DIR } from "../constant";
import { MusicCache, State, downloadMusic } from ".";
import type {
  PlayTreeItemData,
  QueueSortOrder,
  QueueSortType,
} from "../treeview";
import { Uri, window } from "vscode";
import type { Socket } from "net";
import { apiSongUrl } from "../api";
import { connect } from "net";
import { createWriteStream } from "fs";
import i18n from "../i18n";
import { platform } from "os";

class IPCClient<T, U = T> {
  private _buffer = "";

  private _socket?: Socket;

  private readonly _path: string;

  constructor(id: string) {
    this._path =
      platform() === "win32"
        ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${id}`
            .replace(/^\//, "")
            .replace(/\//g, "-")}`
        : `/tmp/${ipcAppspace}${id}`;
  }

  connect(handler: (data: U) => void): Promise<boolean> {
    return new Promise<boolean>(
      (resolve) =>
        void this._tryConnect()
          .then((socket) => {
            if (!socket) {
              resolve(false);
              return;
            }

            this._socket = socket
              .on("close", () => this.disconnect())
              .on("error", console.error)
              .on("data", (data) => {
                const buffer = this._buffer + data.toString();

                if (buffer.lastIndexOf(ipcDelimiter) === -1) {
                  this._buffer = buffer;
                  return;
                }

                this._buffer = "";
                const msgs = buffer.split(ipcDelimiter);
                msgs.pop();
                for (const msg of msgs) handler(JSON.parse(msg));
              });

            resolve(true);
          })
          .catch((err) => {
            console.error(err);
            resolve(false);
          })
    );
  }

  disconnect(): void {
    this._socket?.destroy();
    this._socket = undefined;
  }

  send(data: T): void {
    this._socket?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  private _tryConnect(): Promise<Socket | undefined> {
    return new Promise((resolve) => {
      const setTimer = (remain: number) => {
        const socket = connect({ path: this._path }).setEncoding("utf8");
        const listener = () => {
          socket.destroy();
          if (remain > 0) setTimeout(() => setTimer(remain - 1), 1500);
          else resolve(undefined);
        };
        socket
          .once("connect", () => {
            resolve(socket);
            socket.off("close", listener);
          })
          .once("close", listener);
      };
      setTimer(4);
    });
  }
}

export const ipc = new IPCClient<IPCClientMsg, IPCServerMsg>(ipcServerId);
export const ipcB = new IPCClient<IPCBroadcastMsg>(ipcBroadcastServerId);

const minSize = MUSIC_QUALITY === 999000 ? 2 * 1024 * 1024 : 256 * 1024;

export class IPC {
  static async load(): Promise<void> {
    const { playItem } = State;
    if (!playItem) return;
    State.loading = true;

    if (playItem instanceof LocalFileTreeItem) {
      ipc.send({ t: IPCEvent.Play.load, url: playItem.tooltip });
      return;
    }

    const {
      data: { pid },
      item,
    } = playItem;
    const idS = `${item.id}`;
    {
      const url = MusicCache.get(idS);
      if (url) {
        ipc.send({ t: IPCEvent.Play.load, url, pid });
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
          ipc.send({ t: IPCEvent.Play.load, url: tmpUri.fsPath, pid });
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
    ipc.send({ t: IPCEvent.Play.stop });
  }

  static toggle(): void {
    ipc.send({ t: IPCEvent.Play.toggle });
  }

  static volume(level: number): void {
    ipc.send({ t: IPCEvent.Play.volume, level });
  }

  static add(items: PlayTreeItemData[], index?: number): void {
    ipcB.send({ t: IPCEvent.Queue.add, items, index });
  }

  static clear(): void {
    ipcB.send({ t: IPCEvent.Queue.clear });
  }

  static delete(id: number | string): void {
    ipcB.send({ t: IPCEvent.Queue.delete, id });
  }

  static new(items: PlayTreeItemData[], id?: number): void {
    ipcB.send({ t: IPCEvent.Queue.new, items, id });
  }

  static playSong(id: number | string): void {
    ipcB.send({ t: IPCEvent.Queue.play, id });
  }

  static random(): void {
    ipcB.send({
      t: IPCEvent.Queue.random,
      items: QueueProvider.random(),
    });
  }

  static shift(index: number): void {
    ipcB.send({ t: IPCEvent.Queue.shift, index });
  }

  static sort(type: QueueSortType, order: QueueSortOrder): void {
    ipcB.send({ t: IPCEvent.Queue.sort, type, order });
  }
}
