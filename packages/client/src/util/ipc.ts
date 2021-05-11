import type {
  CSConnPool,
  IPCBroadcastMsg,
  IPCClientMsg,
  IPCServerMsg,
  NeteaseAPICMsg,
  NeteaseAPIKey,
  NeteaseAPIParameters,
  NeteaseAPIReturn,
} from "@cloudmusic/shared";
import { LocalFileTreeItem, QueueProvider } from "../treeview";
import { MUSIC_CACHE_SIZE, MUSIC_QUALITY } from "../constant";
import type {
  PlayTreeItemData,
  QueueSortOrder,
  QueueSortType,
} from "../treeview";
import {
  ipcAppspace,
  ipcBroadcastServerId,
  ipcDelimiter,
  ipcServerId,
} from "@cloudmusic/shared";
import type { Socket } from "net";
import { State } from ".";
import { connect } from "net";
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

  request<D>(data: D): void {
    this._socket?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  private _tryConnect(retry: number): Promise<Socket | undefined> {
    return new Promise((resolve) => {
      const setTimer = (remain: number) => {
        const socket = connect({ path: this._path }).setEncoding("utf8");
        const listener = () => {
          socket.destroy();
          if (remain > 0) setTimeout(() => setTimer(remain - 1), 512);
          else resolve(undefined);
        };
        socket
          .once("connect", () => {
            setTimeout(() => resolve(socket), 512);
            socket.off("close", listener);
          })
          .once("close", listener);
      };
      if (retry <= 0) setTimer(0);
      else setTimeout(() => setTimer(retry), 512);
    });
  }
}

export const ipc = new IPCClient<IPCClientMsg, IPCServerMsg>(ipcServerId);
export const ipcB = new IPCClient<IPCBroadcastMsg>(ipcBroadcastServerId);

export class IPC {
  static requestPool = new Map() as CSConnPool;

  static load(): void {
    const { playItem } = State;
    if (!playItem) return;
    ipcB.send({ t: "player.load" });

    if (playItem instanceof LocalFileTreeItem) {
      ipc.send({
        t: "player.load",
        url: playItem.tooltip,
        local: true,
      });
    } else {
      const {
        data: { pid },
        item: { id },
      } = playItem;
      ipc.send({ t: "player.load", url: `${id}`, pid });
    }
  }

  static deleteCache(key: string): void {
    ipc.send({ t: "control.deleteCache", key });
  }

  static download(url: string, path: string): void {
    ipc.send({ t: "control.download", url, path });
  }

  static init(volume: number): void {
    ipc.send({
      t: "control.init",
      mq: MUSIC_QUALITY,
      cs: MUSIC_CACHE_SIZE,
      volume,
    });
  }

  static login(profile: { userId: number; nickname: string }): void {
    ipcB.send({ t: "control.login", ...profile });
  }

  static logout(): void {
    ipcB.send({ t: "control.logout" });
  }

  static lyric(): void {
    ipc.send({ t: "control.lyric" });
  }

  static music(): void {
    ipc.send({ t: "control.music" });
  }

  static retain(): void {
    ipc.send({ t: "control.retain", items: QueueProvider.toJSON() });
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

  static netease<I extends NeteaseAPIKey, P = NeteaseAPIParameters<I>>(
    i: I,
    p: P
  ): Promise<NeteaseAPIReturn<I>> {
    const channel = `netease-${i}${Date.now()}`;
    return new Promise((resolve, reject) => {
      const prev = this.requestPool.get(channel);
      if (prev) prev.reject();
      this.requestPool.set(channel, { resolve, reject });
      ipc.request<NeteaseAPICMsg<I, P>>({
        t: "api.netease",
        channel,
        msg: { i, p },
      });
    });
  }
}

const getDate = /-(\d+)$/;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of IPC.requestPool) {
    const [, date] = getDate.exec(k as string) as RegExpExecArray;
    if (parseInt(date) - now > 60000) {
      IPC.requestPool.delete(k);
      v.reject();
    } else break;
  }
}, 60000);
