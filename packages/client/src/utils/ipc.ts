import {
  CONF,
  FOREIGN,
  HTTPS_API,
  MUSIC_CACHE_SIZE,
  MUSIC_QUALITY,
  ipcBroadcastServerPath,
  ipcServerPath,
} from "../constant";
import type {
  CSConnPool,
  IPCBroadcastMsg,
  IPCClientMsg,
  IPCServerMsg,
} from "@cloudmusic/shared";
import {
  IPCApi,
  IPCControl,
  IPCPlayer,
  IPCQueue,
  ipcDelimiter,
} from "@cloudmusic/shared";
import { LocalFileTreeItem, QueueProvider } from "../treeview";
import type {
  NeteaseAPICMsg,
  NeteaseAPIKey,
  NeteaseAPIParameters,
  NeteaseAPIReturn,
} from "@cloudmusic/server";
import type { PlayTreeItemData } from "../treeview";
import type { Socket } from "node:net";
import { State } from ".";
import { connect } from "node:net";

class IPCClient<T, U = T> {
  private _buffer = "";

  private _socket?: Socket;

  constructor(private readonly _path: string) {}

  connect(handler: (data: U) => void, retry: number): Promise<boolean> {
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

                const msgs = buffer.split(ipcDelimiter);
                this._buffer = msgs.pop() ?? "";
                for (const msg of msgs) handler(JSON.parse(msg) as U);
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
          .on("error", ({ message }) => console.error(message))
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

const ipc = new IPCClient<IPCClientMsg, IPCServerMsg>(ipcServerPath);
const ipcB = new IPCClient<IPCBroadcastMsg>(ipcBroadcastServerPath);

export class IPC {
  static readonly requestPool = new Map() as CSConnPool;

  private static _nextChann = 0;

  static connect(
    ipcHandler: Parameters<typeof ipc.connect>[0],
    ipcBHandler: Parameters<typeof ipcB.connect>[0],
    retry = 4
  ): Promise<[boolean, boolean]> {
    return Promise.all([
      ipc.connect(ipcHandler, retry),
      ipcB.connect(ipcBHandler, retry),
    ]);
  }

  static disconnect(): void {
    ipc.disconnect();
    ipcB.disconnect();
  }

  static load(): void {
    const { playItem } = State;
    if (!playItem) return;
    ipcB.send({ t: IPCPlayer.load });

    if (playItem instanceof LocalFileTreeItem) {
      ipc.send({ t: IPCPlayer.load, url: playItem.tooltip, local: true });
    } else {
      const { data, item } = playItem;
      let next;
      if (!State.fm) next = QueueProvider.next?.item;
      ipc.send({ t: IPCPlayer.load, item, pid: data.pid, next });
    }
  }

  static loaded(): void {
    ipcB.send({ t: IPCPlayer.loaded });
  }

  static deleteCache(key: string): void {
    ipc.send({ t: IPCControl.deleteCache, key });
  }

  static download(url: string, path: string): void {
    ipc.send({ t: IPCControl.download, url, path });
  }

  static setting(): void {
    const conf = CONF();
    ipc.send({
      t: IPCControl.setting,
      mq: MUSIC_QUALITY(conf),
      cs: MUSIC_CACHE_SIZE(conf),
      https: HTTPS_API(conf),
      foreign: FOREIGN(conf),
    });
  }

  static lyric(): void {
    ipc.send({ t: IPCControl.lyric });
  }

  static cache(): void {
    ipc.send({ t: IPCControl.cache });
  }

  static neteaseAc(): void {
    ipc.send({ t: IPCControl.netease });
  }

  static retain(items?: readonly PlayTreeItemData[]): void {
    ipc.send({ t: IPCControl.retain, items });
  }

  /* static pid(): void {
    ipc.send({ t: IPCControl.pid, pid: process.env["VSCODE_PID"] });
  } */

  static lyricDelay(delay: number): void {
    ipc.send({ t: IPCPlayer.lyricDelay, delay });
  }

  static playing(playing: boolean): void {
    ipc.send({ t: IPCPlayer.playing, playing });
  }

  static position(pos: number): void {
    ipc.send({ t: IPCPlayer.position, pos });
  }

  static repeat(r: boolean): void {
    ipcB.send({ t: IPCPlayer.repeat, r });
  }

  static stop(): void {
    ipc.send({ t: IPCPlayer.stop });
  }

  static toggle(): void {
    ipc.send({ t: IPCPlayer.toggle });
  }

  static volume(level: number): void {
    ipc.send({ t: IPCPlayer.volume, level });
  }

  static speed(speed: number): void {
    ipc.send({ t: IPCPlayer.speed, speed });
  }

  static add(items: readonly PlayTreeItemData[], index?: number): void {
    ipcB.send({ t: IPCQueue.add, items, index });
  }

  static clear(): void {
    ipcB.send({ t: IPCQueue.clear });
  }

  static delete(id: number | string): void {
    ipcB.send({ t: IPCQueue.delete, id });
  }

  static fm(is: boolean, uid = 0): void {
    ipc.send({ t: IPCQueue.fm, uid, is });
  }

  static fmNext(): void {
    ipc.send({ t: IPCQueue.fmNext });
  }

  static new(items?: readonly PlayTreeItemData[]): void {
    if (items) {
      const id = QueueProvider.id + 1;
      ipcB.send({ t: IPCQueue.new, id, items });
    } else {
      const id = QueueProvider.id;
      const items = QueueProvider.songs;
      ipcB.send({ t: IPCQueue.new, id, items });
    }
  }

  static playSong(id: number | string): void {
    ipcB.send({ t: IPCQueue.play, id });
  }

  static random(): void {
    const id = QueueProvider.id + 1;
    ipcB.send({ t: IPCQueue.new, id, items: QueueProvider.random() });
  }

  static shift(index: number): void {
    ipcB.send({ t: IPCQueue.shift, index });
  }

  static netease<I extends NeteaseAPIKey>(
    i: I,
    p: NeteaseAPIParameters<I>
  ): Promise<NeteaseAPIReturn<I>> {
    const channel = ++this._nextChann;
    return new Promise((resolve, reject) => {
      this.requestPool.set(channel, { resolve, reject });
      ipc.request<NeteaseAPICMsg<I>>({
        t: IPCApi.netease,
        channel,
        msg: { i, p },
      });
    });
  }
}
