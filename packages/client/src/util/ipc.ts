import type {
  IPCBroadcastMsg,
  IPCClientMsg,
  IPCServerMsg,
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
import {
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
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

  connect(handler: (data: U) => void, retry = 4): Promise<boolean> {
    if (this._socket?.readable && this._socket.writable)
      return Promise.resolve(true);
    else this.disconnect();
    return new Promise(
      (resolve) =>
        void this._tryConnect(retry)
          .then((socket) => {
            if (!socket) throw new Error();

            this._socket = socket
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
              })
              .on("close", () => this.disconnect())
              .on("error", console.error);

            resolve(true);
          })
          .catch(() => resolve(false))
    );
  }

  disconnect(): void {
    this._socket?.destroy();
    this._socket = undefined;
  }

  send(data: T): void {
    this._socket?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  private _tryConnect(retry: number): Promise<Socket | undefined> {
    return new Promise((resolve) => {
      const setTimer = (remain: number) => {
        const socket = connect({ path: this._path }).setEncoding("utf8");
        const listener = () => {
          socket.destroy();
          if (remain > 0) setTimeout(() => setTimer(remain - 1), 1000);
          else resolve(undefined);
        };
        socket
          .once("connect", () => {
            resolve(socket);
            socket.off("close", listener);
          })
          .once("close", listener);
      };
      setTimer(retry);
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
      ipc.send({
        t: "player.load",
        url: playItem.tooltip,
      });
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
        ipc.send({ t: "player.load", url, pid });
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
          ipc.send({
            t: "player.load",
            url: tmpUri.fsPath,
            pid,
          });
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

  static repeat(r: boolean): void {
    ipcB.send({ t: "player.repeat", r });
  }

  static stop(): void {
    ipc.send({ t: "player.stop" });
  }

  static toggle(): void {
    ipc.send({ t: "player.toggle" });
  }

  static volume(level: number): void {
    ipc.send({ t: "player.volume", level });
  }

  static add(items: PlayTreeItemData[], index?: number): void {
    ipcB.send({ t: "queue.add", items, index });
  }

  static clear(): void {
    ipcB.send({ t: "queue.clear" });
  }

  static delete(id: number | string): void {
    ipcB.send({ t: "queue.delete", id });
  }

  static new(items: PlayTreeItemData[], id?: number): void {
    ipcB.send({ t: "queue.new", items, id });
  }

  static playSong(id: number | string): void {
    ipcB.send({ t: "queue.play", id });
  }

  static random(): void {
    ipcB.send({
      t: "queue.random",
      items: QueueProvider.random(),
    });
  }

  static shift(index: number): void {
    ipcB.send({ t: "queue.shift", index });
  }

  static sort(type: QueueSortType, order: QueueSortOrder): void {
    ipcB.send({ t: "queue.sort", type, order });
  }
}
